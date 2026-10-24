"""
InvariantLens - Invariant Definitions & Registry
Declare-style temporal constraints with four-valued runtime verification.
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from simulator.event_schema import Event, EventType, Service


class Verdict(str, Enum):
    """Four-valued runtime verification verdicts"""
    TRUE = "TRUE"           # Trace closed, consequent occurred
    FALSE = "FALSE"         # Trace closed, consequent did not occur
    PENDING = "PENDING"     # Trace open, "eventually" not decidable
    VACUOUS = "VACUOUS"     # Trace closed, trigger never occurred


class Scope(str, Enum):
    PER_ORDER = "per-order"
    PER_SKU = "per-sku"


@dataclass
class Violation:
    """Violation emitted by detector"""
    invariant_id: str
    scope: Scope
    scope_key: str          # order_id or sku
    verdict: Verdict
    trigger_event_id: str
    trigger_event_type: EventType
    expected_consequent: list[EventType]
    actual_events_after_trigger: list[EventType]
    trace_closed: bool
    confidence: str = "HIGH"  # HIGH, MEDIUM, LOW


class Invariant(ABC):
    """Base class for Declare-style invariants"""
    
    def __init__(self, invariant_id: str, scope: Scope):
        self.invariant_id = invariant_id
        self.scope = scope
    
    @abstractmethod
    def evaluate(self, events: list[Event], trace_closed: bool) -> Verdict:
        """Evaluate invariant on a list of events (single trace or SKU stream)"""
        pass
    
    @abstractmethod
    def get_trigger_type(self) -> EventType:
        """The event type that triggers this invariant"""
        pass
    
    @abstractmethod
    def get_consequent_types(self) -> list[EventType]:
        """The expected consequent event types"""
        pass
    
    def check_violation(self, events: list[Event], trace_closed: bool) -> Violation | None:
        """Check for violation and return violation details if found"""
        verdict = self.evaluate(events, trace_closed)
        
        if verdict in (Verdict.FALSE, Verdict.PENDING):
            # Find trigger event
            trigger_event = None
            for e in events:
                if e.type == self.get_trigger_type():
                    trigger_event = e
                    break
            
            if not trigger_event:
                return None
            
            # Find events after trigger
            trigger_idx = events.index(trigger_event)
            after_events = events[trigger_idx + 1:]
            actual_consequents = [e.type for e in after_events if e.type in self.get_consequent_types()]
            
            return Violation(
                invariant_id=self.invariant_id,
                scope=self.scope,
                scope_key=self._get_scope_key(events),
                verdict=verdict,
                trigger_event_id=trigger_event.event_id,
                trigger_event_type=trigger_event.type,
                expected_consequent=self.get_consequent_types(),
                actual_events_after_trigger=actual_consequents,
                trace_closed=trace_closed,
            )
        return None
    
    def _get_scope_key(self, events: list[Event]) -> str:
        if self.scope == Scope.PER_ORDER:
            return events[0].trace_id if events else ""
        else:  # PER_SKU
            return events[0].stream_keys.sku if events and events[0].stream_keys.sku else ""


# ============================================================
# Concrete Invariants (from SPECS/INVARIANTS.md)
# ============================================================

class ResponseInvariant(Invariant):
    """
    INV-001: Response
    Every OrderPlaced is eventually followed by OrderConfirmed OR OrderFailed
    (complete saga completion)
    """
    def __init__(self):
        super().__init__("INV-001", Scope.PER_ORDER)
    
    def get_trigger_type(self) -> EventType:
        return EventType.ORDER_PLACED
    
    def get_consequent_types(self) -> list[EventType]:
        return [EventType.ORDER_CONFIRMED, EventType.ORDER_FAILED]
    
    def evaluate(self, events: list[Event], trace_closed: bool) -> Verdict:
        # Check if OrderPlaced exists
        has_trigger = any(e.type == EventType.ORDER_PLACED for e in events)
        if not has_trigger:
            return Verdict.VACUOUS
        
        # Check if consequent occurred (OrderConfirmed or OrderFailed)
        has_consequent = any(e.type in self.get_consequent_types() for e in events)
        
        if has_consequent:
            return Verdict.TRUE
        
        if trace_closed:
            return Verdict.FALSE
        
        return Verdict.PENDING


class PrecedenceInvariant(Invariant):
    """
    INV-002: Precedence
    PaymentCaptured must precede OrderConfirmed
    """
    def __init__(self):
        super().__init__("INV-002", Scope.PER_ORDER)
    
    def get_trigger_type(self) -> EventType:
        return EventType.ORDER_CONFIRMED
    
    def get_consequent_types(self) -> list[EventType]:
        return [EventType.PAYMENT_CAPTURED]
    
    def evaluate(self, events: list[Event], trace_closed: bool) -> Verdict:
        # Find OrderConfirmed
        confirmed_events = [e for e in events if e.type == EventType.ORDER_CONFIRMED]
        if not confirmed_events:
            return Verdict.VACUOUS
        
        # Check if PaymentCaptured occurred before any OrderConfirmed
        first_confirmed_idx = min(events.index(e) for e in confirmed_events)
        has_payment_before = any(
            e.type == EventType.PAYMENT_CAPTURED and events.index(e) < first_confirmed_idx
            for e in events
        )
        
        if has_payment_before:
            return Verdict.TRUE
        
        if trace_closed:
            return Verdict.FALSE
        
        return Verdict.PENDING


class AtMostOneInvariant(Invariant):
    """
    INV-003: AtMostOne
    At most one PaymentCaptured per order (per-order) / 
    At most one InventoryReserved per order per SKU (per-sku)
    """
    def __init__(self, scope: Scope = Scope.PER_ORDER):
        invariant_id = "INV-003" if scope == Scope.PER_ORDER else "INV-003-SKU"
        super().__init__(invariant_id, scope)
    
    def get_trigger_type(self) -> EventType:
        return EventType.PAYMENT_CAPTURED if self.scope == Scope.PER_ORDER else EventType.INVENTORY_RESERVED
    
    def get_consequent_types(self) -> list[EventType]:
        return [EventType.PAYMENT_CAPTURED] if self.scope == Scope.PER_ORDER else [EventType.INVENTORY_RESERVED]
    
    def evaluate(self, events: list[Event], trace_closed: bool) -> Verdict:
        trigger_type = self.get_trigger_type()
        
        if self.scope == Scope.PER_ORDER:
            # Per-order: at most one trigger per trace
            trigger_count = sum(1 for e in events if e.type == trigger_type)
            if trigger_count <= 1:
                return Verdict.TRUE
            return Verdict.FALSE
        else:
            # Per-SKU: at most one trigger per order-SKU pair
            # Group by order_id within this SKU stream
            from collections import defaultdict
            by_order = defaultdict(list)
            for e in events:
                if e.type == trigger_type:
                    order_id = e.payload.get("order_id")
                    if order_id:
                        by_order[order_id].append(e)
            
            # Check each order has at most one
            for order_id, order_events in by_order.items():
                if len(order_events) > 1:
                    return Verdict.FALSE
            return Verdict.TRUE


class NotSuccessionInvariant(Invariant):
    """
    INV-004: NotSuccession
    InventoryRejected must not be followed by OrderConfirmed
    """
    def __init__(self):
        super().__init__("INV-004", Scope.PER_ORDER)
    
    def get_trigger_type(self) -> EventType:
        return EventType.INVENTORY_REJECTED
    
    def get_consequent_types(self) -> list[EventType]:
        return [EventType.ORDER_CONFIRMED]
    
    def evaluate(self, events: list[Event], trace_closed: bool) -> Verdict:
        # Find InventoryRejected
        rejected_events = [e for e in events if e.type == EventType.INVENTORY_REJECTED]
        if not rejected_events:
            return Verdict.VACUOUS
        
        # Check if any OrderConfirmed occurs after any InventoryRejected
        for rejected in rejected_events:
            rejected_idx = events.index(rejected)
            after_rejected = events[rejected_idx + 1:]
            if any(e.type == EventType.ORDER_CONFIRMED for e in after_rejected):
                return Verdict.FALSE
        
        return Verdict.TRUE


class CoExistenceInvariant(Invariant):
    """
    INV-005: CoExistence
    OrderPlaced and PaymentCaptured coexist (both or neither)
    """
    def __init__(self):
        super().__init__("INV-005", Scope.PER_ORDER)
    
    def get_trigger_type(self) -> EventType:
        return EventType.ORDER_PLACED
    
    def get_consequent_types(self) -> list[EventType]:
        return [EventType.PAYMENT_CAPTURED]
    
    def evaluate(self, events: list[Event], trace_closed: bool) -> Verdict:
        has_order = any(e.type == EventType.ORDER_PLACED for e in events)
        has_payment = any(e.type == EventType.PAYMENT_CAPTURED for e in events)
        
        if has_order == has_payment:  # Both true or both false
            return Verdict.TRUE
        
        if trace_closed:
            return Verdict.FALSE
        
        return Verdict.PENDING


class StockConservationInvariant(Invariant):
    """
    INV-006: StockConservation (per-SKU, cross-order)
    For each SKU: Reserved + Available = InitialStock at all times
    """
    def __init__(self, initial_stock: dict[str, int]):
        super().__init__("INV-006", Scope.PER_SKU)
        self.initial_stock = initial_stock
    
    def get_trigger_type(self) -> EventType:
        return EventType.INVENTORY_RESERVED  # Any inventory event triggers check
    
    def get_consequent_types(self) -> list[EventType]:
        return [EventType.INVENTORY_RESERVED, EventType.INVENTORY_REJECTED, EventType.INVENTORY_RELEASED]
    
    def evaluate(self, events: list[Event], trace_closed: bool) -> Verdict:
        if not events:
            return Verdict.VACUOUS
        
        sku = events[0].stream_keys.sku
        if not sku or sku not in self.initial_stock:
            return Verdict.VACUOUS
        
        initial = self.initial_stock[sku]
        reserved = 0
        released = 0
        
        for e in events:
            if e.type == EventType.INVENTORY_RESERVED:
                reserved += e.payload.get("quantity", 1)
            elif e.type == EventType.INVENTORY_RELEASED:
                released += e.payload.get("quantity", 1)
        
        current_reserved = reserved - released
        available = initial - current_reserved
        
        # Check conservation: Reserved + Available == Initial
        if current_reserved + available == initial and current_reserved >= 0 and available >= 0:
            return Verdict.TRUE
        
        return Verdict.FALSE


# ============================================================
# Invariant Registry
# ============================================================

class InvariantRegistry:
    """Registry of all invariants with evaluation logic"""
    
    def __init__(self, initial_stock: dict[str, int] | None = None):
        self.invariants: list[Invariant] = []
        self.initial_stock = initial_stock or {}
        self._register_default_invariants()
    
    def _register_default_invariants(self):
        """Register the 6 spec-first invariants"""
        self.invariants.append(ResponseInvariant())           # INV-001
        self.invariants.append(PrecedenceInvariant())         # INV-002
        self.invariants.append(AtMostOneInvariant(Scope.PER_ORDER))   # INV-003 per-order
        self.invariants.append(AtMostOneInvariant(Scope.PER_SKU))     # INV-003 per-SKU
        self.invariants.append(NotSuccessionInvariant())      # INV-004
        self.invariants.append(CoExistenceInvariant())        # INV-005
        self.invariants.append(StockConservationInvariant(self.initial_stock))  # INV-006
    
    def evaluate_trace(self, events: list[Event], trace_closed: bool) -> list[Violation]:
        """Evaluate all per-order invariants on a single trace"""
        violations = []
        for inv in self.invariants:
            if inv.scope == Scope.PER_ORDER:
                violation = inv.check_violation(events, trace_closed)
                if violation:
                    violations.append(violation)
        return violations
    
    def evaluate_sku_stream(self, events: list[Event], trace_closed: bool) -> list[Violation]:
        """Evaluate per-SKU invariants on a SKU stream"""
        violations = []
        for inv in self.invariants:
            if inv.scope == Scope.PER_SKU:
                violation = inv.check_violation(events, trace_closed)
                if violation:
                    violations.append(violation)
        return violations
    
    def evaluate_all(self, all_events: list[Event], trace_closed_map: dict[str, bool]) -> list[Violation]:
        """Evaluate all invariants on all events grouped by trace and SKU"""
        all_violations = []
        
        # Group by trace_id (per-order)
        from collections import defaultdict
        by_trace = defaultdict(list)
        by_sku = defaultdict(list)
        
        for e in all_events:
            by_trace[e.trace_id].append(e)
            if e.stream_keys.sku:
                by_sku[e.stream_keys.sku].append(e)
        
        # Evaluate per-order
        for trace_id, events in by_trace.items():
            trace_closed = trace_closed_map.get(trace_id, False)
            violations = self.evaluate_trace(sorted(events, key=lambda e: e.delivery_seq), trace_closed)
            all_violations.extend(violations)
        
        # Evaluate per-SKU
        for sku, events in by_sku.items():
            # SKU streams are closed when all traces for that SKU are closed
            sku_closed = all(trace_closed_map.get(e.trace_id, False) for e in events)
            violations = self.evaluate_sku_stream(sorted(events, key=lambda e: e.delivery_seq), sku_closed)
            all_violations.extend(violations)
        
        return all_violations