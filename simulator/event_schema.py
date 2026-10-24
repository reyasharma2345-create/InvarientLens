"""
InvariantLens - Event Schema Definitions
Canonical event format with logical clocks, causal parents, and stream keys.
"""

from __future__ import annotations
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Literal
from pydantic import BaseModel, Field, field_validator


class Service(str, Enum):
    ORDERS = "Orders"
    PAYMENTS = "Payments"
    INVENTORY = "Inventory"


class EventType(str, Enum):
    # Orders
    ORDER_PLACED = "OrderPlaced"
    ORDER_CONFIRMED = "OrderConfirmed"
    ORDER_FAILED = "OrderFailed"

    # Payments
    PAYMENT_CAPTURED = "PaymentCaptured"
    PAYMENT_FAILED = "PaymentFailed"
    REFUND_PAYMENT = "RefundPayment"

    # Inventory
    INVENTORY_RESERVED = "InventoryReserved"
    INVENTORY_REJECTED = "InventoryRejected"
    INVENTORY_RELEASED = "InventoryReleased"


class StreamKeys(BaseModel):
    order_id: str
    sku: str | None = None


class EventPayload(BaseModel):
    """Base payload - extended by specific event types"""
    pass


# Orders payloads
class OrderPlacedPayload(EventPayload):
    order_id: str
    sku: str
    quantity: int = 1
    customer_id: str


class OrderConfirmedPayload(EventPayload):
    order_id: str
    confirmation_code: str


class OrderFailedPayload(EventPayload):
    order_id: str
    reason: Literal["payment_failed", "inventory_rejected", "compensation_failed"]


# Payments payloads
class PaymentCapturedPayload(EventPayload):
    order_id: str
    amount: float
    currency: str = "USD"
    idempotency_key: str


class PaymentFailedPayload(EventPayload):
    order_id: str
    reason: str


class RefundPaymentPayload(EventPayload):
    order_id: str
    amount: float
    reason: Literal["inventory_rejected", "order_cancelled"]


# Inventory payloads
class InventoryReservedPayload(EventPayload):
    order_id: str
    sku: str
    quantity: int = 1


class InventoryRejectedPayload(EventPayload):
    order_id: str
    sku: str
    reason: Literal["out_of_stock", "internal_error"]


class InventoryReleasedPayload(EventPayload):
    order_id: str
    sku: str
    quantity: int = 1


PAYLOAD_MAP: dict[EventType, type[EventPayload]] = {
    EventType.ORDER_PLACED: OrderPlacedPayload,
    EventType.ORDER_CONFIRMED: OrderConfirmedPayload,
    EventType.ORDER_FAILED: OrderFailedPayload,
    EventType.PAYMENT_CAPTURED: PaymentCapturedPayload,
    EventType.PAYMENT_FAILED: PaymentFailedPayload,
    EventType.REFUND_PAYMENT: RefundPaymentPayload,
    EventType.INVENTORY_RESERVED: InventoryReservedPayload,
    EventType.INVENTORY_REJECTED: InventoryRejectedPayload,
    EventType.INVENTORY_RELEASED: InventoryReleasedPayload,
}


class Event(BaseModel):
    """Canonical event format for InvariantLens"""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trace_id: str
    stream_keys: StreamKeys
    service: Service
    type: EventType
    logical_clock: int
    wall_ts: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    causal_parent_ids: list[str] = Field(default_factory=list)
    delivery_seq: int = 0
    payload: dict[str, Any] = Field(default_factory=dict)

    @field_validator("payload", mode="before")
    @classmethod
    def validate_payload(cls, v, info):
        if isinstance(v, dict) and "type" in info.data:
            event_type = info.data["type"]
            if isinstance(event_type, str):
                event_type = EventType(event_type)
            if event_type in PAYLOAD_MAP:
                return PAYLOAD_MAP[event_type](**v).model_dump()
        return v

    def model_post_init(self, __context):
        # Ensure trace_id matches stream_keys.order_id
        if self.trace_id != self.stream_keys.order_id:
            raise ValueError("trace_id must match stream_keys.order_id")


# Causal parent rules (from SPECS/EVENT_SCHEMA.md)
CAUSAL_PARENT_RULES: dict[EventType, list[EventType]] = {
    EventType.PAYMENT_CAPTURED: [EventType.ORDER_PLACED],
    EventType.PAYMENT_FAILED: [EventType.ORDER_PLACED],
    EventType.INVENTORY_RESERVED: [EventType.ORDER_PLACED],
    EventType.INVENTORY_REJECTED: [EventType.ORDER_PLACED],
    EventType.INVENTORY_RELEASED: [EventType.ORDER_PLACED, EventType.INVENTORY_RESERVED],
    EventType.ORDER_CONFIRMED: [EventType.PAYMENT_CAPTURED, EventType.INVENTORY_RESERVED],
    EventType.ORDER_FAILED: [EventType.PAYMENT_FAILED, EventType.INVENTORY_REJECTED, EventType.REFUND_PAYMENT],
    EventType.REFUND_PAYMENT: [EventType.INVENTORY_REJECTED, EventType.ORDER_FAILED],
}

# Service that emits each event type
EMITTER_SERVICE: dict[EventType, Service] = {
    EventType.ORDER_PLACED: Service.ORDERS,
    EventType.ORDER_CONFIRMED: Service.ORDERS,
    EventType.ORDER_FAILED: Service.ORDERS,
    EventType.PAYMENT_CAPTURED: Service.PAYMENTS,
    EventType.PAYMENT_FAILED: Service.PAYMENTS,
    EventType.REFUND_PAYMENT: Service.PAYMENTS,
    EventType.INVENTORY_RESERVED: Service.INVENTORY,
    EventType.INVENTORY_REJECTED: Service.INVENTORY,
    EventType.INVENTORY_RELEASED: Service.INVENTORY,
}