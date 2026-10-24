"""
InvariantLens - Violation Detector & Causal Analyzer
Finds violations and locates the first divergence point on the manifest graph.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any
from collections import defaultdict
from simulator.event_schema import Event, EventType, Service, CAUSAL_PARENT_RULES, EMITTER_SERVICE
from invariants import InvariantRegistry, Violation, Verdict, Scope


@dataclass
class DivergencePoint:
    """First point where workflow diverged from declared event flow"""
    event_id: str
    service: Service
    event_type: EventType
    trace_id: str
    expected_obligation: str  # What should have happened
    actual_behavior: str      # What actually happened
    confidence: str           # HIGH, MEDIUM, LOW
    evidence_event_ids: list[str] = field(default_factory=list)
    missing_causal_parents: list[str] = field(default_factory=list)


@dataclass
class RefutedAlternative:
    """An alternative hypothesis that was refuted by evidence"""
    claim: str
    refuted_by_event_id: str
    refutation_reason: str


@dataclass
class DiagnosisResult:
    """Complete diagnosis output"""
    violation: Violation
    divergence: DivergencePoint
    cited_evidence: list[str]
    refuted_alternatives: list[RefutedAlternative]
    confidence: str


# Service Manifest (from ARCHITECTURE.md)
# Each service declares what it consumes, emits, and owes downstream
SERVICE_MANIFEST = {
    Service.ORDERS: {
        "consumes": [EventType.PAYMENT_CAPTURED, EventType.PAYMENT_FAILED, 
                     EventType.INVENTORY_RESERVED, EventType.INVENTORY_REJECTED,
                     EventType.REFUND_PAYMENT],
        "emits": [EventType.ORDER_PLACED, EventType.ORDER_CONFIRMED, EventType.ORDER_FAILED],
        "owes_downstream": {
            EventType.ORDER_PLACED: [EventType.PAYMENT_CAPTURED, EventType.INVENTORY_RESERVED, EventType.INVENTORY_REJECTED],
            EventType.PAYMENT_CAPTURED: [EventType.ORDER_CONFIRMED, EventType.ORDER_FAILED],
            EventType.INVENTORY_RESERVED: [EventType.ORDER_CONFIRMED, EventType.ORDER_FAILED],
            EventType.INVENTORY_REJECTED: [EventType.ORDER_FAILED],
            EventType.PAYMENT_FAILED: [EventType.ORDER_FAILED],
            EventType.REFUND_PAYMENT: [EventType.ORDER_FAILED],
        }
    },
    Service.PAYMENTS: {
        "consumes": [EventType.ORDER_PLACED, EventType.INVENTORY_REJECTED],
        "emits": [EventType.PAYMENT_CAPTURED, EventType.PAYMENT_FAILED, EventType.REFUND_PAYMENT],
        "owes_downstream": {
            EventType.ORDER_PLACED: [EventType.PAYMENT_CAPTURED],
            EventType.INVENTORY_REJECTED: [EventType.REFUND_PAYMENT],
        }
    },
    Service.INVENTORY: {
        "consumes": [EventType.ORDER_PLACED],
        "emits": [EventType.INVENTORY_RESERVED, EventType.INVENTORY_REJECTED, EventType.INVENTORY_RELEASED],
        "owes_downstream": {
            EventType.ORDER_PLACED: [EventType.INVENTORY_RESERVED, EventType.INVENTORY_REJECTED],
        }
    }
}


class ViolationDetector:
    """Detects invariant violations from event traces"""
    
    def __init__(self, registry: InvariantRegistry):
        self.registry = registry
    
    def detect(self, all_events: list[Event], trace_closed_map: dict[str, bool]) -> list[Violation]:
        """Run all invariants and return violations"""
        return self.registry.evaluate_all(all_events, trace_closed_map)


class CausalAnalyzer:
    """
    Finds the first divergence point by walking the manifest graph 
    along actual causal parents from the trigger event.
    """
    
    def __init__(self):
        self.manifest = SERVICE_MANIFEST
    
    def analyze(self, violation: Violation, all_events: list[Event]) -> DiagnosisResult:
        """Full causal analysis from violation to divergence point"""
        
        # Find trigger event
        trigger_event = next((e for e in all_events if e.event_id == violation.trigger_event_id), None)
        if not trigger_event:
            raise ValueError(f"Trigger event {violation.trigger_event_id} not found")
        
        # Build event lookup
        event_by_id = {e.event_id: e for e in all_events}
        
        # Get the trace events
        trace_events = [e for e in all_events if e.trace_id == violation.scope_key]
        trace_events.sort(key=lambda e: e.delivery_seq)
        
        # Find divergence by walking manifest from trigger
        divergence = self._find_divergence(violation, trigger_event, trace_events, event_by_id)
        
        # Generate cited evidence
        cited_evidence = self._gather_evidence(violation, trace_events, event_by_id)
        
        # Generate and refute alternatives
        refuted_alternatives = self._refute_alternatives(violation, divergence, trace_events, event_by_id)
        
        # Determine overall confidence
        confidence = self._calculate_confidence(divergence, trace_events, event_by_id)
        
        return DiagnosisResult(
            violation=violation,
            divergence=divergence,
            cited_evidence=cited_evidence,
            refuted_alternatives=refuted_alternatives,
            confidence=confidence,
        )
    
    def _find_divergence(self, violation: Violation, trigger_event: Event, 
                        trace_events: list[Event], event_by_id: dict[str, Event]) -> DivergencePoint:
        """
        Walk the manifest graph along causal parents from trigger.
        First node whose declared obligation is unmet = divergence point.
        """
        
        # For Response invariants (INV-001), go directly to saga divergence analysis
        if violation.invariant_id == "INV-001":
            return self._find_saga_divergence(violation, trigger_event, trace_events, event_by_id)
        
        # Map from event type to the service that should respond
        trigger_type = violation.trigger_event_type
        trigger_service = EMITTER_SERVICE.get(trigger_type)
        
        if not trigger_service:
            return DivergencePoint(
                event_id=trigger_event.event_id,
                service=trigger_event.service,
                event_type=trigger_event.type,
                trace_id=violation.scope_key,
                expected_obligation=f"Unknown trigger type {trigger_type}",
                actual_behavior="No manifest entry",
                confidence="LOW",
            )
        
        # Get what this service owes downstream for this trigger
        owes = self.manifest[trigger_service]["owes_downstream"].get(trigger_type, [])
        
        if not owes:
            # Trigger doesn't create obligations (e.g., ORDER_CONFIRMED)
            return DivergencePoint(
                event_id=trigger_event.event_id,
                service=trigger_service,
                event_type=trigger_event.type,
                trace_id=violation.scope_key,
                expected_obligation="No downstream obligation",
                actual_behavior="Terminal event",
                confidence="HIGH",
            )
        
        # Check each owed event - find first one that's missing
        for owed_type in owes:
            # Find if owed event exists in trace after trigger
            trigger_idx = trace_events.index(trigger_event)
            after_trigger = trace_events[trigger_idx + 1:]
            
            owed_event = next((e for e in after_trigger if e.type == owed_type), None)
            
            if not owed_event:
                # This obligation is unmet - this is the divergence!
                # The service that SHOULD have emitted this is the divergence point
                owing_service = EMITTER_SERVICE.get(owed_type)
                owing_service_value = owing_service.value if owing_service else "Unknown"
                
                # Check causal parents for confidence
                missing_parents = []
                required_parents = CAUSAL_PARENT_RULES.get(owed_type, [])
                for req_parent_type in required_parents:
                    parent_exists = any(e.type == req_parent_type for e in trace_events)
                    if not parent_exists:
                        missing_parents.append(req_parent_type.value)
                
                confidence = "LOW" if missing_parents else "HIGH"
                
                return DivergencePoint(
                    event_id=trigger_event.event_id,  # The trigger event is where divergence starts
                    service=owing_service or trigger_service,
                    event_type=owed_type,  # The MISSING event type
                    trace_id=violation.scope_key,
                    expected_obligation=f"{owing_service_value} should emit {owed_type.value} after {trigger_type.value}",
                    actual_behavior=f"No {owed_type.value} emitted",
                    confidence=confidence,
                    evidence_event_ids=[trigger_event.event_id],
                    missing_causal_parents=missing_parents,
                )
        
        # All first-order obligations met - check downstream obligations recursively
        for owed_type in owes:
            owed_event = next((e for e in trace_events if e.type == owed_type), None)
            if owed_event:
                # Recursively check this event's obligations
                sub_divergence = self._check_downstream_obligations(owed_event, trace_events, event_by_id)
                if sub_divergence:
                    return sub_divergence
        
        # Fallback
        return DivergencePoint(
            event_id=trigger_event.event_id,
            service=trigger_service,
            event_type=trigger_event.type,
            trace_id=violation.scope_key,
            expected_obligation="All first-order obligations met",
            actual_behavior="Unknown divergence",
            confidence="MEDIUM",
        )
    
    def _find_saga_divergence(self, violation: Violation, trigger_event: Event,
                             trace_events: list[Event], event_by_id: dict[str, Event]) -> DivergencePoint:
        """
        For INV-001 (Response): Find where the saga failed to complete.
        Expected: OrderPlaced -> ... -> OrderConfirmed OR OrderFailed
        """
        # Check what events occurred after OrderPlaced
        trigger_idx = trace_events.index(trigger_event)
        after_trigger = trace_events[trigger_idx + 1:]
        event_types_after = {e.type for e in after_trigger}
        
        # If we have PaymentCaptured and InventoryRejected but no OrderFailed/Confirmed
        # The divergence is at Orders not completing the saga
        has_payment = EventType.PAYMENT_CAPTURED in event_types_after
        has_inv_rejected = EventType.INVENTORY_REJECTED in event_types_after
        has_inv_reserved = EventType.INVENTORY_RESERVED in event_types_after
        has_confirmed = EventType.ORDER_CONFIRMED in event_types_after
        has_failed = EventType.ORDER_FAILED in event_types_after
        
        # Case: Payment succeeded, Inventory rejected, but no OrderFailed
        if has_payment and has_inv_rejected and not has_failed and not has_confirmed:
            return DivergencePoint(
                event_id=trigger_event.event_id,
                service=Service.ORDERS,
                event_type=EventType.ORDER_FAILED,  # The missing terminal event
                trace_id=violation.scope_key,
                expected_obligation=f"Orders should emit OrderFailed after PaymentCaptured + InventoryRejected",
                actual_behavior="Orders did not emit OrderFailed after InventoryRejected",
                confidence="HIGH",
                evidence_event_ids=[trigger_event.event_id] + [e.event_id for e in after_trigger],
                missing_causal_parents=[],
            )
        
        # Case: Payment succeeded, Inventory reserved, but no OrderConfirmed
        if has_payment and has_inv_reserved and not has_confirmed and not has_failed:
            return DivergencePoint(
                event_id=trigger_event.event_id,
                service=Service.ORDERS,
                event_type=EventType.ORDER_CONFIRMED,
                trace_id=violation.scope_key,
                expected_obligation=f"Orders should emit OrderConfirmed after PaymentCaptured + InventoryReserved",
                actual_behavior="Orders did not emit OrderConfirmed",
                confidence="HIGH",
                evidence_event_ids=[trigger_event.event_id] + [e.event_id for e in after_trigger],
                missing_causal_parents=[],
            )
        
        # Case: Payment failed, but no OrderFailed
        if EventType.PAYMENT_FAILED in event_types_after and not has_failed and not has_confirmed:
            return DivergencePoint(
                event_id=trigger_event.event_id,
                service=Service.ORDERS,
                event_type=EventType.ORDER_FAILED,
                trace_id=violation.scope_key,
                expected_obligation=f"Orders should emit OrderFailed after PaymentFailed",
                actual_behavior="Orders did not emit OrderFailed after PaymentFailed",
                confidence="HIGH",
                evidence_event_ids=[trigger_event.event_id] + [e.event_id for e in after_trigger],
                missing_causal_parents=[],
            )
        
        # Default: no clear saga divergence found
        return DivergencePoint(
            event_id=trigger_event.event_id,
            service=Service.ORDERS,
            event_type=EventType.ORDER_FAILED,
            trace_id=violation.scope_key,
            expected_obligation="Saga completion (OrderConfirmed or OrderFailed)",
            actual_behavior="Saga did not complete",
            confidence="MEDIUM",
            evidence_event_ids=[e.event_id for e in trace_events],
            missing_causal_parents=[],
        )
    
    def _check_downstream_obligations(self, event: Event, trace_events: list[Event], 
                                       event_by_id: dict[str, Event]) -> DivergencePoint | None:
        """Check if a downstream event's obligations were met"""
        service = EMITTER_SERVICE.get(event.type)
        if not service:
            return None
        
        owes = self.manifest[service]["owes_downstream"].get(event.type, [])
        
        for owed_type in owes:
            event_idx = trace_events.index(event)
            after_event = trace_events[event_idx + 1:]
            
            owed_event = next((e for e in after_event if e.type == owed_type), None)
            
            if not owed_event:
                owing_service = EMITTER_SERVICE.get(owed_type)
                owing_service_value = owing_service.value if owing_service else "Unknown"
                
                # Check causal parents
                missing_parents = []
                required_parents = CAUSAL_PARENT_RULES.get(owed_type, [])
                for req_parent_type in required_parents:
                    parent_exists = any(e.type == req_parent_type for e in trace_events)
                    if not parent_exists:
                        missing_parents.append(req_parent_type.value)
                
                confidence = "LOW" if missing_parents else "HIGH"
                
                return DivergencePoint(
                    event_id=event.event_id,
                    service=owing_service or service,
                    event_type=owed_type,
                    trace_id=event.trace_id,
                    expected_obligation=f"{owing_service_value} should emit {owed_type.value} after {event.type.value}",
                    actual_behavior=f"No {owed_type.value} emitted",
                    confidence=confidence,
                    evidence_event_ids=[event.event_id],
                    missing_causal_parents=missing_parents,
                )
        
        return None
    
    def _gather_evidence(self, violation: Violation, trace_events: list[Event], 
                        event_by_id: dict[str, Event]) -> list[str]:
        """Gather event IDs that support the diagnosis"""
        evidence = []
        
        # Trigger event
        evidence.append(violation.trigger_event_id)
        
        # Events that occurred after trigger
        trigger_event = event_by_id.get(violation.trigger_event_id)
        if trigger_event:
            # Find index by event_id
            trigger_idx = next((i for i, e in enumerate(trace_events) if e.event_id == trigger_event.event_id), -1)
            if trigger_idx >= 0:
                after_trigger = trace_events[trigger_idx + 1:]
                for e in after_trigger:
                    evidence.append(e.event_id)
        
        return evidence
    
    def _refute_alternatives(self, violation: Violation, divergence: DivergencePoint,
                            trace_events: list[Event], event_by_id: dict[str, Event]) -> list[RefutedAlternative]:
        """Generate and refute alternative hypotheses"""
        alternatives = []
        
        trigger_event = event_by_id.get(violation.trigger_event_id)
        if not trigger_event:
            return alternatives
        
        # Find index by event_id
        trigger_idx = next((i for i, e in enumerate(trace_events) if e.event_id == trigger_event.event_id), -1)
        if trigger_idx < 0:
            return alternatives
            
        after_trigger = trace_events[trigger_idx + 1:]
        event_types_after = {e.type for e in after_trigger}
        
        # Alternative 1: "Payment failed"
        if EventType.PAYMENT_FAILED not in event_types_after and EventType.PAYMENT_CAPTURED in event_types_after:
            payment_captured = next(e for e in after_trigger if e.type == EventType.PAYMENT_CAPTURED)
            alternatives.append(RefutedAlternative(
                claim="Payment failed",
                refuted_by_event_id=payment_captured.event_id,
                refutation_reason=f"PaymentCaptured event {payment_captured.event_id} exists",
            ))
        
        # Alternative 2: "Inventory succeeded"
        if EventType.INVENTORY_RESERVED not in event_types_after and EventType.INVENTORY_REJECTED in event_types_after:
            inventory_rejected = next(e for e in after_trigger if e.type == EventType.INVENTORY_REJECTED)
            alternatives.append(RefutedAlternative(
                claim="Inventory succeeded",
                refuted_by_event_id=inventory_rejected.event_id,
                refutation_reason=f"InventoryRejected event {inventory_rejected.event_id} exists",
            ))
        
        # Alternative 3: "Order was never placed"
        if EventType.ORDER_PLACED in event_types_after or trigger_event.type == EventType.ORDER_PLACED:
            alternatives.append(RefutedAlternative(
                claim="Order was never placed",
                refuted_by_event_id=trigger_event.event_id,
                refutation_reason=f"OrderPlaced event {trigger_event.event_id} exists",
            ))
        
        # Alternative 4: "Compensation was issued"
        if EventType.REFUND_PAYMENT not in event_types_after:
            # Check if it should have been issued
            if EventType.INVENTORY_REJECTED in event_types_after:
                alternatives.append(RefutedAlternative(
                    claim="Compensation was issued",
                    refuted_by_event_id="",
                    refutation_reason="No RefundPayment event found in trace after InventoryRejected",
                ))
        
        return alternatives
    
    def _calculate_confidence(self, divergence: DivergencePoint, trace_events: list[Event],
                             event_by_id: dict[str, Event]) -> str:
        """Calculate overall diagnosis confidence"""
        if divergence.confidence == "LOW":
            return "LOW"
        
        # Check for clock conflicts
        clocks = [e.logical_clock for e in trace_events]
        if len(set(clocks)) != len(clocks):
            return "MEDIUM"
        
        # Check causal parent completeness
        for e in trace_events:
            for parent_id in e.causal_parent_ids:
                if parent_id not in event_by_id:
                    return "MEDIUM"
        
        return "HIGH"


class DetectorPipeline:
    """Complete detection pipeline: detect -> analyze"""
    
    def __init__(self, registry: InvariantRegistry):
        self.detector = ViolationDetector(registry)
        self.analyzer = CausalAnalyzer()
    
    def run(self, all_events: list[Event], trace_closed_map: dict[str, bool]) -> list[DiagnosisResult]:
        """Run full detection and analysis pipeline"""
        violations = self.detector.detect(all_events, trace_closed_map)
        results = []
        
        for violation in violations:
            if violation.verdict in (Verdict.FALSE, Verdict.PENDING):
                diagnosis = self.analyzer.analyze(violation, all_events)
                results.append(diagnosis)
        
        return results