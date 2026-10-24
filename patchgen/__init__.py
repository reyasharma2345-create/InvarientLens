"""
InvariantLens - Patch Generator
Generates candidate patches from diagnosis results using multiple strategies.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Any
from enum import Enum


class PatchStrategy(Enum):
    COMPENSATION = "compensation"
    IDEMPOTENCY_KEY = "idempotency_key"
    ORDERING_GUARD = "ordering_guard"
    OUTBOX_RETRY = "outbox_retry"
    STATE_MACHINE_FIX = "state_machine_fix"
    BOUNDARY_CHECK = "boundary_check"
    CAUSAL_COMPLETION = "causal_completion"
    NULL_GUARD = "null_guard"


@dataclass
class PatchCandidate:
    candidate_id: str
    strategy: PatchStrategy
    target_file: str
    target_function: str
    diff: str
    description: str
    confidence: float
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "candidate_id": self.candidate_id,
            "strategy": self.strategy.value,
            "target_file": self.target_file,
            "target_function": self.target_function,
            "diff": self.diff,
            "description": self.description,
            "confidence": self.confidence,
        }


class PatchGenerator:
    def __init__(self):
        self.candidates: list[PatchCandidate] = []
        self.candidate_counter = 0
    
    def generate_candidates(
        self,
        bug_id: str,
        diagnosis_result: dict[str, Any],
        source_files: dict[str, str]
    ) -> list[PatchCandidate]:
        self.candidates = []
        self.candidate_counter = 0
        
        root_cause = diagnosis_result.get("root_cause", "").lower()
        hypothesis = diagnosis_result.get("hypothesis", "").lower()
        expected_obligation = diagnosis_result.get("expected_obligation", "").lower()
        
        # Combine all text for keyword matching
        all_text = f"{root_cause} {hypothesis} {expected_obligation}"
        
        # Strategy 1: Compensation saga (for missing compensation bugs)
        if any(kw in all_text for kw in ["compensation", "refund", "orderfailed", "order_failed", "fail order", "failed"]):
            self._add_compensation_patch(bug_id)
        
        # Strategy 2: Idempotency key (for double-charge bugs)
        if any(kw in all_text for kw in ["idempotent", "duplicate", "double", "retry"]):
            self._add_idempotency_patch(bug_id)
        
        # Strategy 3: Ordering guard (for event ordering bugs)
        if any(kw in all_text for kw in ["order", "precedence", "race", "ordering", "before", "after", "sequence"]):
            self._add_ordering_guard_patch(bug_id)
        
        # Strategy 4: Outbox/retry (for lost message bugs)
        if any(kw in all_text for kw in ["drop", "lost", "missing", "deliver", "network", "partition"]):
            self._add_outbox_retry_patch(bug_id)
        
        # Strategy 5: State machine fix (for crash/state bugs)
        if any(kw in all_text for kw in ["crash", "state", "recover", "persist", "recovery"]):
            self._add_state_machine_patch(bug_id)
        
        # Strategy 6: Boundary check (for last-item race)
        if any(kw in all_text for kw in ["stock", "reserv", "atomic", "inventory", "concurrent", "race condition"]):
            self._add_boundary_check_patch(bug_id)
        
        # Strategy 7: Causal completion (for incomplete saga)
        if any(kw in all_text for kw in ["saga", "complete", "obligation", "causal", "downstream", "trigger"]):
            self._add_causal_completion_patch(bug_id)
        
        # Strategy 8: Null/empty guard (defensive)
        self._add_null_guard_patch(bug_id)
        
        # Fallback
        if not self.candidates:
            self._add_generic_patches(bug_id)
        
        self.candidates.sort(key=lambda c: c.confidence, reverse=True)
        return self.candidates[:8]
    
    def _add_candidate(self, bug_id: str, strategy: PatchStrategy, target_file: str, 
                       target_function: str, diff: str, description: str, confidence: float):
        self.candidate_counter += 1
        candidate = PatchCandidate(
            candidate_id=f"{bug_id}_{strategy.value}_{self.candidate_counter}",
            strategy=strategy,
            target_file=target_file,
            target_function=target_function,
            diff=diff,
            description=description,
            confidence=confidence
        )
        self.candidates.append(candidate)
    
    def _add_compensation_patch(self, bug_id: str):
        diff = (
            "@@ -232,7 +232,11 @@\n"
            "     def on_inventory_rejected(self, event: Event) -> Event | None:\n"
            '         """Handle InventoryRejected - issue refund (compensation)"""\n'
            '         order_id = event.payload["order_id"]\n'
            "         amount = 99.99\n"
            " \n"
            '-        # C1_A: Missing compensation - Payments never receives compensation command\n'
            '+        # C1_A FIX: Always emit RefundPayment on InventoryRejected\n'
            '+        if BUG_FLAGS["C1_A"]:\n'
            '+            # Bug was here - now fixed\n'
            '+            pass\n'
            '+        # Normal: emit RefundPayment\n'
            '         return self._refund_payment(order_id, amount, "inventory_rejected", event.event_id)'
        )
        self._add_candidate(
            bug_id, PatchStrategy.COMPENSATION,
            "services/__init__.py", "PaymentsService.on_inventory_rejected",
            diff, "Add missing compensation saga: emit RefundPayment when InventoryRejected is received",
            0.95
        )
    
    def _add_idempotency_patch(self, bug_id: str):
        diff = (
            "@@ -204,13 +204,15 @@\n"
            '     def on_order_placed(self, event: Event) -> Event | None:\n'
            '         """Handle OrderPlaced - capture payment"""\n'
            '         order_id = event.payload["order_id"]\n'
            "         amount = 99.99\n"
            '         idempotency_key = f"pay-{order_id}"\n'
            " \n"
            '-        # C3_A: Idempotency bug - no deduplication\n'
            '-        if BUG_FLAGS["C3_A"]:\n'
            '-            if idempotency_key in self.processed_payments:\n'
            '-                # Bug: treat as new payment, create duplicate\n'
            '-                pass  # Allow duplicate\n'
            '-            else:\n'
            '-                self.processed_payments.add(idempotency_key)\n'
            '+        # C3_A FIX: Always deduplicate by idempotency key\n'
            '+        if idempotency_key in self.processed_payments:\n'
            '+            return None  # Already processed\n'
            '+        self.processed_payments.add(idempotency_key)\n'
            "+\n"
            '         # C4_A: PaymentCaptured before InventoryReserved (bug)\n'
            '         if BUG_FLAGS["C4_A"]:'
        )
        self._add_candidate(
            bug_id, PatchStrategy.IDEMPOTENCY_KEY,
            "services/__init__.py", "PaymentsService.on_order_placed",
            diff, "Add idempotency deduplication: reject duplicate PaymentCaptured for same order",
            0.95
        )
    
    def _add_ordering_guard_patch(self, bug_id: str):
        diff = (
            "@@ -72,11 +72,16 @@\n"
            '     def on_payment_captured(self, event: Event) -> Event | None:\n'
            '         """Handle PaymentCaptured - check if we can confirm"""\n'
            '         order_id = event.payload["order_id"]\n'
            "         order = self.orders.get(order_id)\n"
            "         if not order:\n"
            "             return None\n"
            "         \n"
            '         order["payment_captured"] = True\n'
            "         \n"
            '+        # C4_B FIX: Wait for InventoryReserved before confirming\n'
            '+        if BUG_FLAGS["C4_B"]:\n'
            '+            # Bug was confirming on OrderPlaced alone - now wait for inventory\n'
            '+            if not order["inventory_reserved"]:\n'
            '+                return None\n'
            '+        \n'
            '         # Check if inventory also reserved (C4_A: Orders confirms before payment - bug variant)\n'
            '         if BUG_FLAGS["C4_B"]:  # Orders confirms on OrderPlaced alone\n'
            '             return self._confirm_order(order_id, event.event_id)\n'
            "         \n"
            '         if order["inventory_reserved"]:\n'
            '             return self._confirm_order(order_id, event.event_id)'
        )
        self._add_candidate(
            bug_id, PatchStrategy.ORDERING_GUARD,
            "services/__init__.py", "OrdersService.on_payment_captured",
            diff, "Add ordering guard: Orders waits for InventoryReserved before confirming",
            0.90
        )
    
    def _add_outbox_retry_patch(self, bug_id: str):
        diff = (
            "@@ -1,5 +1,8 @@\n"
            "+# Outbox pattern for reliable event delivery\n"
            "+import threading\n"
            "+from dataclasses import dataclass, field\n"
            "+\n"
            " from __future__ import annotations\n"
            " from dataclasses import dataclass, field\n"
            "@@ -66,6 +69,15 @@\n"
            "         self.total_duplicated = 0\n"
            " \n"
            "+    # Outbox for reliable delivery\n"
            "+    outbox: list = field(default_factory=list)\n"
            "+    outbox_lock = threading.Lock()\n"
            "+\n"
            "+    def flush_outbox(self):\n"
            '+        """Retry pending outbox events"""\n'
            "+        pass\n"
            "+\n"
            '     def register_handler(self, service: Service, event_type: EventType, handler: Callable):\n'
            '         """Register a handler for a specific event type on a service"""\n'
            '         self.handlers[service].append((event_type, handler))'
        )
        self._add_candidate(
            bug_id, PatchStrategy.OUTBOX_RETRY,
            "simulator/message_bus.py", "MessageBus.__post_init__",
            diff, "Add outbox pattern for reliable event delivery with retry",
            0.70
        )
    
    def _add_state_machine_patch(self, bug_id: str):
        diff = (
            "@@ -113,11 +113,17 @@\n"
            '     def on_inventory_rejected(self, event: Event) -> Event | None:\n'
            '         """Handle InventoryRejected - fail order, trigger compensation"""\n'
            '         order_id = event.payload["order_id"]\n'
            "         order = self.orders.get(order_id)\n"
            "         if not order:\n"
            "             return None\n"
            "         \n"
            '         order["inventory_rejected"] = True\n'
            "         \n"
            '+        # C1_B FIX: Persist state and handle recovery\n'
            '+        # On crash recovery, check for orders with payment_captured but no confirmation\n'
            '+        if BUG_FLAGS["C1_B"]:\n'
            '+            # Bug was silent crash - now emit OrderFailed to trigger compensation\n'
            '+            return self._fail_order(order_id, "inventory_rejected", event.event_id)\n'
            '+        \n'
            '         # C1_A: Missing compensation - Orders does not trigger refund\n'
            '         if BUG_FLAGS["C1_A"]:\n'
            '             # Bug: Orders fails but does not ensure refund happens - does not emit OrderFailed\n'
            '             order["status"] = "failed"'
        )
        self._add_candidate(
            bug_id, PatchStrategy.STATE_MACHINE_FIX,
            "services/__init__.py", "OrdersService.on_inventory_rejected",
            diff, "Add state machine fix: ensure OrderFailed is emitted on InventoryRejected even after crash",
            0.85
        )
    
    def _add_boundary_check_patch(self, bug_id: str):
        diff = (
            "@@ -349,10 +349,15 @@\n"
            '     def _reserve_with_race(self, order_id: str, sku: str, quantity: int, causal_parent_id: str) -> Event | None:\n'
            '         """C2_A: Check-then-act race - both orders see stock=1 and both reserve"""\n'
            "         # This simulates the race by not atomically checking and decrementing\n"
            "         # In reality, both orders read stock=1, then both decrement to 0\n"
            "         # Here we simulate by allowing over-reservation - both see the INITIAL stock\n"
            "         # before either decrements. We track if a race is in progress.\n"
            "-        if not hasattr(self, '_race_initial_stock'):\n"
            "-            self._race_initial_stock = self.stock.get(sku, 0)\n"
            "-            self._race_reserved = 0\n"
            "-\n"
            "-        available = self._race_initial_stock - self._race_reserved\n"
            "+        # C2_A FIX: Atomic compare-and-swap\n"
            '+        available = self.stock.get(sku, 0)\n'
            '+        if available < quantity:\n'
            '+            return self._reject_inventory(order_id, sku, "out_of_stock", causal_parent_id)\n'
            "+        \n"
            "+        # Atomic decrement\n"
            '+        self.stock[sku] = available - quantity\n'
            "         if available >= quantity:\n"
            "             # Bug: allow over-reservation beyond actual stock\n"
            "             self._race_reserved += quantity"
        )
        self._add_candidate(
            bug_id, PatchStrategy.BOUNDARY_CHECK,
            "services/__init__.py", "InventoryService._reserve_with_race",
            diff, "Add atomic compare-and-swap for inventory reservation to prevent over-reservation",
            0.90
        )
    
    def _add_causal_completion_patch(self, bug_id: str):
        diff = (
            "@@ -84,6 +84,12 @@\n"
            '         if order["inventory_reserved"]:\n'
            '             return self._confirm_order(order_id, event.event_id)\n'
            "         \n"
            '+        # Causal completion: ensure we track what we\'re waiting for\n'
            '+        order.setdefault("waiting_for_inventory", False)\n'
            '+        order["waiting_for_inventory"] = True\n'
            "+        # On recovery, check waiting_for_inventory and reconcile\n"
            "+        \n"
            '         # C1_B: Orders crash after PaymentCaptured - don\'t confirm even if inventory later arrives\n'
            '         if BUG_FLAGS["C1_B"]:\n'
            '             # Bug: Orders service crashes before confirming'
        )
        self._add_candidate(
            bug_id, PatchStrategy.CAUSAL_COMPLETION,
            "services/__init__.py", "OrdersService.on_payment_captured",
            diff, "Add causal completion tracking: persist waiting state for crash recovery",
            0.75
        )
    
    def _add_null_guard_patch(self, bug_id: str):
        diff = (
            "@@ -72,6 +72,10 @@\n"
            '     def on_payment_captured(self, event: Event) -> Event | None:\n'
            '         """Handle PaymentCaptured - check if we can confirm"""\n'
            '         order_id = event.payload["order_id"]\n'
            "+        if not order_id:\n"
            '+            return None  # Guard against malformed event\n'
            "         order = self.orders.get(order_id)\n"
            "         if not order:\n"
            "             return None"
        )
        self._add_candidate(
            bug_id, PatchStrategy.NULL_GUARD,
            "services/__init__.py", "OrdersService.on_payment_captured",
            diff, "Add defensive null guards for malformed events",
            0.60
        )
    
    def _add_generic_patches(self, bug_id: str):
        strategies = [
            (PatchStrategy.COMPENSATION, "Add compensation handler for missing downstream event"),
            (PatchStrategy.IDEMPOTENCY_KEY, "Add idempotency deduplication for duplicate events"),
            (PatchStrategy.ORDERING_GUARD, "Add ordering guard for precedence violation"),
            (PatchStrategy.BOUNDARY_CHECK, "Add boundary check for resource exhaustion"),
            (PatchStrategy.STATE_MACHINE_FIX, "Fix state machine transition logic"),
            (PatchStrategy.OUTBOX_RETRY, "Add outbox pattern for reliable delivery"),
            (PatchStrategy.CAUSAL_COMPLETION, "Add causal completion tracking"),
            (PatchStrategy.NULL_GUARD, "Add defensive null/empty guards"),
        ]
        
        for strategy, desc in strategies:
            if len(self.candidates) >= 8:
                break
            self._add_candidate(
                bug_id, strategy,
                "services/__init__.py", "auto_generated",
                f"# Auto-generated {strategy.value} patch for {bug_id}",
                desc, 0.50
            )


def generate_patches_for_bug(
    bug_id: str,
    diagnosis_result: dict[str, Any],
    source_files: dict[str, str]
) -> list[PatchCandidate]:
    generator = PatchGenerator()
    return generator.generate_candidates(bug_id, diagnosis_result, source_files)