"""
InvariantLens - Service Implementations
Three services: Orders, Payments, Inventory with bug injection flags.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any
from simulator.event_schema import (
    Event, EventType, Service, StreamKeys,
    OrderPlacedPayload, OrderConfirmedPayload, OrderFailedPayload,
    PaymentCapturedPayload, PaymentFailedPayload, RefundPaymentPayload,
    InventoryReservedPayload, InventoryRejectedPayload, InventoryReleasedPayload,
    CAUSAL_PARENT_RULES, EMITTER_SERVICE
)
from simulator.message_bus import MessageBus, create_event


# Bug injection flags (from SPECS/BUGS.md)
BUG_FLAGS = {
    "C1_A": False, "C1_B": False,
    "C2_A": False, "C2_B": False,
    "C3_A": False, "C3_B": False,
    "C4_A": False, "C4_B": False,
    "C5_A": False, "C5_B": False,
    "C6_A": False, "C6_B": False,
    "BS_001": False,  # blind-spot
}


@dataclass
class OrdersService:
    """Orders service - handles order placement, confirmation, failure"""
    bus: MessageBus
    orders: dict[str, dict] = field(default_factory=dict)  # order_id -> state
    
    def __post_init__(self):
        self.bus.register_handler(Service.ORDERS, EventType.PAYMENT_CAPTURED, self.on_payment_captured)
        self.bus.register_handler(Service.ORDERS, EventType.PAYMENT_FAILED, self.on_payment_failed)
        self.bus.register_handler(Service.ORDERS, EventType.INVENTORY_RESERVED, self.on_inventory_reserved)
        self.bus.register_handler(Service.ORDERS, EventType.INVENTORY_REJECTED, self.on_inventory_rejected)
        self.bus.register_handler(Service.ORDERS, EventType.REFUND_PAYMENT, self.on_refund_payment)

    def place_order(self, order_id: str, sku: str, customer_id: str) -> Event:
        """Customer places an order"""
        # Create order state
        self.orders[order_id] = {
            "sku": sku,
            "customer_id": customer_id,
            "status": "placed",
            "payment_captured": False,
            "inventory_reserved": False,
            "inventory_rejected": False,
            "refund_issued": False,
        }
        
        event = create_event(
            trace_id=order_id,
            event_type=EventType.ORDER_PLACED,
            payload={
                "order_id": order_id,
                "sku": sku,
                "quantity": 1,
                "customer_id": customer_id,
            },
            sku=sku,
        )
        
        self.bus.emit(event)
        return event

    def on_payment_captured(self, event: Event) -> Event | None:
        """Handle PaymentCaptured - check if we can confirm"""
        order_id = event.payload["order_id"]
        order = self.orders.get(order_id)
        if not order:
            return None
        
        order["payment_captured"] = True
        
        # Check if inventory also reserved (C4_A: Orders confirms before payment - bug variant)
        if BUG_FLAGS["C4_B"]:  # Orders confirms on OrderPlaced alone
            return self._confirm_order(order_id, event.event_id)
        
        if order["inventory_reserved"]:
            return self._confirm_order(order_id, event.event_id)
        
        # C1_B: Orders crash after PaymentCaptured - don't confirm even if inventory later arrives
        if BUG_FLAGS["C1_B"]:
            # Bug: Orders service crashes before confirming
            # (simulated by not responding to InventoryReserved)
            return None
        
        return None

    def on_payment_failed(self, event: Event) -> Event | None:
        """Handle PaymentFailed - fail the order"""
        order_id = event.payload["order_id"]
        return self._fail_order(order_id, "payment_failed", event.event_id)

    def on_inventory_reserved(self, event: Event) -> Event | None:
        """Handle InventoryReserved - check if we can confirm"""
        order_id = event.payload["order_id"]
        order = self.orders.get(order_id)
        if not order:
            return None
        
        order["inventory_reserved"] = True
        
        # C4_B bug: Orders confirms before PaymentCaptured
        if BUG_FLAGS["C4_B"]:
            return self._confirm_order(order_id, event.event_id)
        
        if order["payment_captured"]:
            # C1_B: Orders crash after PaymentCaptured - don't confirm even if inventory arrived
            if BUG_FLAGS["C1_B"]:
                # Bug: Orders service crashed, can't confirm
                return None
            return self._confirm_order(order_id, event.event_id)
        
        return None

    def on_inventory_rejected(self, event: Event) -> Event | None:
        """Handle InventoryRejected - fail order, trigger compensation"""
        order_id = event.payload["order_id"]
        order = self.orders.get(order_id)
        if not order:
            return None
        
        order["inventory_rejected"] = True
        
        # C1_A: Missing compensation - Orders doesn't trigger refund
        if BUG_FLAGS["C1_A"]:
            # Bug: Orders fails but doesn't ensure refund happens - doesn't emit OrderFailed
            order["status"] = "failed"
            return None  # No OrderFailed emitted, no compensation triggered
        
        # Normal: fail order, compensation handled by Payments
        return self._fail_order(order_id, "inventory_rejected", event.event_id)

    def on_refund_payment(self, event: Event) -> Event | None:
        """Handle RefundPayment - order fully failed"""
        order_id = event.payload["order_id"]
        order = self.orders.get(order_id)
        if not order:
            return None
        
        order["refund_issued"] = True
        order["status"] = "failed"
        
        # Emit OrderFailed if not already emitted
        if order["status"] != "failed_confirmed":
            return self._fail_order(order_id, "compensation_failed", event.event_id)
        
        return None

    def _confirm_order(self, order_id: str, causal_parent_id: str) -> Event | None:
        """Emit OrderConfirmed"""
        order = self.orders[order_id]
        
        # Idempotency: don't confirm if already confirmed or failed
        if order["status"] in ("confirmed", "failed"):
            return None
        
        order["status"] = "confirmed"
        
        event = create_event(
            trace_id=order_id,
            event_type=EventType.ORDER_CONFIRMED,
            payload={
                "order_id": order_id,
                "confirmation_code": f"CONF-{order_id[:8]}",
            },
            causal_parents=[causal_parent_id],
            sku=order["sku"],
        )
        self.bus.emit(event)
        return event

    def _fail_order(self, order_id: str, reason: str, causal_parent_id: str) -> Event | None:
        """Emit OrderFailed"""
        order = self.orders[order_id]
        
        # Idempotency: don't fail if already failed or confirmed
        if order["status"] in ("failed", "confirmed"):
            return None
        
        order["status"] = "failed"
        
        event = create_event(
            trace_id=order_id,
            event_type=EventType.ORDER_FAILED,
            payload={
                "order_id": order_id,
                "reason": reason,
            },
            causal_parents=[causal_parent_id],
            sku=order["sku"],
        )
        self.bus.emit(event)
        return event


@dataclass
class PaymentsService:
    """Payments service - handles payment capture, failure, refunds"""
    bus: MessageBus
    processed_payments: set = field(default_factory=set)  # idempotency keys
    
    def __post_init__(self):
        self.bus.register_handler(Service.PAYMENTS, EventType.ORDER_PLACED, self.on_order_placed)
        self.bus.register_handler(Service.PAYMENTS, EventType.INVENTORY_REJECTED, self.on_inventory_rejected)

    def on_order_placed(self, event: Event) -> Event | None:
        """Handle OrderPlaced - capture payment"""
        order_id = event.payload["order_id"]
        amount = 99.99  # Fixed for demo
        idempotency_key = f"pay-{order_id}"
        
        # C3_A: Idempotency bug - no deduplication
        if BUG_FLAGS["C3_A"]:
            if idempotency_key in self.processed_payments:
                # Bug: treat as new payment, create duplicate
                pass  # Allow duplicate
            else:
                self.processed_payments.add(idempotency_key)
        else:
            # Normal: deduplicate
            if idempotency_key in self.processed_payments:
                return None  # Already processed
            self.processed_payments.add(idempotency_key)
        
        # C4_A: PaymentCaptured before InventoryReserved (bug)
        if BUG_FLAGS["C4_A"]:
            # Bug: emit PaymentCaptured immediately without waiting for inventory
            return self._capture_payment(order_id, amount, idempotency_key, event.event_id)
        
        # Normal: would wait for inventory in real system, but for simulator
        # we emit immediately (the ordering is controlled by scheduler)
        return self._capture_payment(order_id, amount, idempotency_key, event.event_id)

    def on_inventory_rejected(self, event: Event) -> Event | None:
        """Handle InventoryRejected - issue refund (compensation)"""
        order_id = event.payload["order_id"]
        amount = 99.99
        
        # C1_A: Missing compensation - Payments never receives compensation command
        # This bug is actually in Orders not triggering, but let's also allow Payments bug
        if BUG_FLAGS["C1_A"]:
            # Bug: Payments doesn't emit RefundPayment
            return None
        
        return self._refund_payment(order_id, amount, "inventory_rejected", event.event_id)

    def _capture_payment(self, order_id: str, amount: float, idempotency_key: str, causal_parent_id: str) -> Event:
        """Emit PaymentCaptured"""
        event = create_event(
            trace_id=order_id,
            event_type=EventType.PAYMENT_CAPTURED,
            payload={
                "order_id": order_id,
                "amount": amount,
                "currency": "USD",
                "idempotency_key": idempotency_key,
            },
            causal_parents=[causal_parent_id],
        )
        self.bus.emit(event)
        return event

    def _refund_payment(self, order_id: str, amount: float, reason: str, causal_parent_id: str) -> Event:
        """Emit RefundPayment"""
        event = create_event(
            trace_id=order_id,
            event_type=EventType.REFUND_PAYMENT,
            payload={
                "order_id": order_id,
                "amount": amount,
                "reason": reason,
            },
            causal_parents=[causal_parent_id],
        )
        self.bus.emit(event)
        return event


@dataclass
class InventoryService:
    """Inventory service - handles stock reservation, rejection, release"""
    bus: MessageBus
    stock: dict[str, int] = field(default_factory=dict)  # sku -> available count
    reservations: dict[str, dict] = field(default_factory=dict)  # order_id -> {sku, qty}
    processed_reservations: set = field(default_factory=set)  # for idempotency
    
    def __post_init__(self):
        self.bus.register_handler(Service.INVENTORY, EventType.ORDER_PLACED, self.on_order_placed)
        # Note: In a real system, we'd also handle order cancellation for INVENTORY_RELEASED
    
    def initialize_stock(self, sku: str, count: int):
        """Set initial stock for a SKU"""
        self.stock[sku] = count

    def on_order_placed(self, event: Event) -> Event | None:
        """Handle OrderPlaced - reserve inventory"""
        order_id = event.payload["order_id"]
        sku = event.payload["sku"]
        quantity = event.payload.get("quantity", 1)
        
        # C2_A: Last-item race - check-then-act without atomicity
        if BUG_FLAGS["C2_A"]:
            return self._reserve_with_race(order_id, sku, quantity, event.event_id)
        
        # C3_B: Duplicate delivery - not idempotent
        if BUG_FLAGS["C3_B"]:
            return self._reserve_non_idempotent(order_id, sku, quantity, event.event_id)
        
        # BS_001: Blind spot - wrong SKU reserved
        if BUG_FLAGS["BS_001"]:
            return self._reserve_wrong_sku(order_id, sku, quantity, event.event_id)
        
        # Normal: atomic reservation
        return self._reserve_atomic(order_id, sku, quantity, event.event_id)

    def _reserve_atomic(self, order_id: str, sku: str, quantity: int, causal_parent_id: str) -> Event | None:
        """Atomic reservation (correct behavior)"""
        available = self.stock.get(sku, 0)
        
        if available >= quantity:
            self.stock[sku] = available - quantity
            self.reservations[order_id] = {"sku": sku, "quantity": quantity}
            
            event = create_event(
                trace_id=order_id,
                event_type=EventType.INVENTORY_RESERVED,
                payload={
                    "order_id": order_id,
                    "sku": sku,
                    "quantity": quantity,
                },
                causal_parents=[causal_parent_id],
                sku=sku,
            )
            self.bus.emit(event)
            return event
        else:
            # Out of stock
            return self._reject_inventory(order_id, sku, "out_of_stock", causal_parent_id)

    def _reserve_with_race(self, order_id: str, sku: str, quantity: int, causal_parent_id: str) -> Event | None:
        """C2_A: Check-then-act race - both orders see stock=1 and both reserve"""
        # This simulates the race by not atomically checking and decrementing
        # In reality, both orders read stock=1, then both decrement to 0
        # Here we simulate by allowing over-reservation - both see the INITIAL stock
        # before either decrements. We track if a race is in progress.
        if not hasattr(self, '_race_initial_stock'):
            self._race_initial_stock = self.stock.get(sku, 0)
            self._race_reserved = 0
        
        available = self._race_initial_stock - self._race_reserved
        
        if available >= quantity:
            # Bug: allow over-reservation beyond actual stock
            self._race_reserved += quantity
            self.reservations[order_id] = {"sku": sku, "quantity": quantity}
            
            event = create_event(
                trace_id=order_id,
                event_type=EventType.INVENTORY_RESERVED,
                payload={
                    "order_id": order_id,
                    "sku": sku,
                    "quantity": quantity,
                },
                causal_parents=[causal_parent_id],
                sku=sku,
            )
            self.bus.emit(event)
            
            # Update actual stock (can go negative in race)
            actual_available = self.stock.get(sku, 0)
            self.stock[sku] = actual_available - quantity
            
            return event
        else:
            # In the bug variant, we STILL emit InventoryReserved even if "out of stock"
            # to simulate the race where both passed the check
            self._race_reserved += quantity
            self.reservations[order_id] = {"sku": sku, "quantity": quantity}
            
            event = create_event(
                trace_id=order_id,
                event_type=EventType.INVENTORY_RESERVED,
                payload={
                    "order_id": order_id,
                    "sku": sku,
                    "quantity": quantity,
                },
                causal_parents=[causal_parent_id],
                sku=sku,
            )
            self.bus.emit(event)
            
            # Update actual stock (goes negative)
            actual_available = self.stock.get(sku, 0)
            self.stock[sku] = actual_available - quantity
            
            return event

    def _reserve_non_idempotent(self, order_id: str, sku: str, quantity: int, causal_parent_id: str) -> Event | None:
        """C3_B: Not idempotent - duplicate delivery causes double reservation"""
        reservation_key = f"{order_id}:{sku}"
        
        if reservation_key in self.processed_reservations:
            # Bug: process again anyway (duplicate delivery)
            pass
        else:
            self.processed_reservations.add(reservation_key)
        
        available = self.stock.get(sku, 0)
        
        if available >= quantity:
            self.stock[sku] = available - quantity
            self.reservations[order_id] = {"sku": sku, "quantity": quantity}
            
            event = create_event(
                trace_id=order_id,
                event_type=EventType.INVENTORY_RESERVED,
                payload={
                    "order_id": order_id,
                    "sku": sku,
                    "quantity": quantity,
                },
                causal_parents=[causal_parent_id],
                sku=sku,
            )
            self.bus.emit(event)
            return event
        else:
            return self._reject_inventory(order_id, sku, "out_of_stock", causal_parent_id)

    def _reserve_wrong_sku(self, order_id: str, sku: str, quantity: int, causal_parent_id: str) -> Event | None:
        """BS_001: Silent data corruption - reserve wrong SKU"""
        # Bug: swap SKU with another (e.g., SKU-A <-> SKU-B)
        wrong_sku = "SKU-WRONG" if sku == "SKU-A" else "SKU-A"
        
        available = self.stock.get(wrong_sku, 0)
        
        if available >= quantity:
            self.stock[wrong_sku] = available - quantity
            self.reservations[order_id] = {"sku": wrong_sku, "quantity": quantity}
            
            event = create_event(
                trace_id=order_id,
                event_type=EventType.INVENTORY_RESERVED,
                payload={
                    "order_id": order_id,
                    "sku": wrong_sku,  # Wrong SKU in payload!
                    "quantity": quantity,
                },
                causal_parents=[causal_parent_id],
                sku=wrong_sku,
            )
            self.bus.emit(event)
            return event
        else:
            return self._reject_inventory(order_id, wrong_sku, "out_of_stock", causal_parent_id)

    def _reject_inventory(self, order_id: str, sku: str, reason: str, causal_parent_id: str) -> Event:
        """Emit InventoryRejected"""
        event = create_event(
            trace_id=order_id,
            event_type=EventType.INVENTORY_REJECTED,
            payload={
                "order_id": order_id,
                "sku": sku,
                "reason": reason,
            },
            causal_parents=[causal_parent_id],
            sku=sku,
        )
        self.bus.emit(event)
        return event

    def release_reservation(self, order_id: str) -> Event | None:
        """Release a reservation (for order cancellation) - C2_B bug"""
        reservation = self.reservations.get(order_id)
        if not reservation:
            return None
        
        sku = reservation["sku"]
        quantity = reservation["quantity"]
        
        # C2_B: InventoryReleased not emitted on cancellation
        if BUG_FLAGS["C2_B"]:
            # Bug: update stock but don't emit event
            self.stock[sku] = self.stock.get(sku, 0) + quantity
            del self.reservations[order_id]
            return None
        
        # Normal: emit InventoryReleased
        self.stock[sku] = self.stock.get(sku, 0) + quantity
        del self.reservations[order_id]
        
        event = create_event(
            trace_id=order_id,
            event_type=EventType.INVENTORY_RELEASED,
            payload={
                "order_id": order_id,
                "sku": sku,
                "quantity": quantity,
            },
            sku=sku,
        )
        self.bus.emit(event)
        return event


def create_services(bus: MessageBus, initial_stock: dict[str, int] | None = None) -> tuple[OrdersService, PaymentsService, InventoryService]:
    """Factory to create all three services wired to the same bus"""
    orders = OrdersService(bus)
    payments = PaymentsService(bus)
    inventory = InventoryService(bus)
    
    if initial_stock:
        for sku, count in initial_stock.items():
            inventory.initialize_stock(sku, count)
    
    return orders, payments, inventory