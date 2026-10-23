# InvariantLens Specifications: Event Schema

**Version:** 3  
**Principle:** Structured, deterministic events with logical clocks and causal parents — never rely on wall-clock alone.

---

## Event Format (Canonical)

```json
{
  "event_id": "uuid-v4-string",
  "trace_id": "order-uuid-string",
  "stream_keys": {
    "order_id": "order-uuid-string",
    "sku": "sku-string-or-null"
  },
  "service": "Orders | Payments | Inventory",
  "type": "EventType",
  "logical_clock": 42,
  "wall_ts": "2026-10-21T10:00:00.123Z",
  "causal_parent_ids": ["evt-uuid-1", "evt-uuid-2"],
  "delivery_seq": 15,
  "payload": {}
}
```

---

## Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_id` | UUIDv4 string | ✅ | Globally unique event identifier |
| `trace_id` | UUID string | ✅ | Workflow identifier (order ID). Groups all events in one workflow. |
| `stream_keys` | Object | ✅ | Keys for cross-order / per-SKU streams |
| `stream_keys.order_id` | UUID string | ✅ | Same as trace_id for per-order scope |
| `stream_keys.sku` | String or null | ✅ | SKU for Inventory events; null for Orders/Payments |
| `service` | Enum | ✅ | Originating service: `Orders`, `Payments`, `Inventory` |
| `type` | Enum | ✅ | Event type (see Event Types below) |
| `logical_clock` | Integer | ✅ | Lamport timestamp. Incremented on each send; max(local, received)+1 on receive. |
| `wall_ts` | ISO8601 string | ✅ | Wall-clock timestamp. **May be skewed. Never reason over this alone.** |
| `causal_parent_ids` | Array[UUID] | ✅ | Direct causal parents (events that caused this event). Empty for root events. |
| `delivery_seq` | Integer | ✅ | Scheduler delivery sequence number. Monotonic per trace. |
| `payload` | Object | ✅ | Event-specific data (see Payload Schemas below) |

---

## Event Types

### Orders Service
| Type | Description | Payload |
|------|-------------|---------|
| `OrderPlaced` | Customer places order | `{ "order_id": "...", "sku": "...", "quantity": 1, "customer_id": "..." }` |
| `OrderConfirmed` | Order fully confirmed | `{ "order_id": "...", "confirmation_code": "..." }` |
| `OrderFailed` | Order failed (payment/refund/inventory) | `{ "order_id": "...", "reason": "payment_failed \| inventory_rejected \| compensation_failed" }` |

### Payments Service
| Type | Description | Payload |
|------|-------------|---------|
| `PaymentCaptured` | Payment successfully captured | `{ "order_id": "...", "amount": 99.99, "currency": "USD", "idempotency_key": "..." }` |
| `PaymentFailed` | Payment failed | `{ "order_id": "...", "reason": "insufficient_funds \| gateway_error \| ..." }` |
| `RefundPayment` | Refund issued (compensation) | `{ "order_id": "...", "amount": 99.99, "reason": "inventory_rejected \| order_cancelled" }` |

### Inventory Service
| Type | Description | Payload |
|------|-------------|---------|
| `InventoryReserved` | Stock reserved for order | `{ "order_id": "...", "sku": "...", "quantity": 1 }` |
| `InventoryRejected` | Stock unavailable / error | `{ "order_id": "...", "sku": "...", "reason": "out_of_stock \| internal_error" }` |
| `InventoryReleased` | Reservation released (cancellation) | `{ "order_id": "...", "sku": "...", "quantity": 1 }` |

---

## Causal Parent Rules

| Child Event | Required Causal Parents |
|-------------|------------------------|
| `PaymentCaptured` | `OrderPlaced` |
| `PaymentFailed` | `OrderPlaced` |
| `InventoryReserved` | `OrderPlaced` |
| `InventoryRejected` | `OrderPlaced` |
| `InventoryReleased` | `OrderPlaced` + `InventoryReserved` (the reservation being released) |
| `OrderConfirmed` | `PaymentCaptured` + `InventoryReserved` |
| `OrderFailed` | One of: `PaymentFailed`, `InventoryRejected`, `RefundPayment` |
| `RefundPayment` | `InventoryRejected` OR `OrderFailed` (compensation trigger) |

**Invariant:** Every non-root event must have at least one causal parent that exists in the same trace.

---

## Logical Clock Protocol (Lamport)

```
# On sending event:
local_clock += 1
event.logical_clock = local_clock

# On receiving event:
local_clock = max(local_clock, received_event.logical_clock) + 1
event.logical_clock = local_clock
```

**Scheduler assigns** `delivery_seq` monotonically per trace (1, 2, 3...). This is the "true" delivery order for replay.

---

## Trace Closure

A trace is **closed** when:
1. Terminal event observed: `OrderConfirmed` or `OrderFailed`, OR
2. Scheduler quiescence: no pending messages in bus for 100 scheduler ticks

**Detector behavior:**
- While trace open: violations reported as `PENDING`
- On closure: `PENDING` → `TRUE` / `FALSE` / `VACUOUS`

---

## Real-Trace Adapter Mapping (OTel → InvariantLens)

| OTel Concept | InvariantLens Field |
|--------------|---------------------|
| Span | Event |
| Span.trace_id | trace_id |
| Span.parent_span_id | causal_parent_ids (single) |
| Span.name | type (mapped) |
| Span.attributes | payload |
| Span.start_time | wall_ts |
| — | logical_clock (synthesized from causal order) |
| — | delivery_seq (synthesized from span order in trace) |
| — | service (from resource.attributes.service.name) |
| — | stream_keys (from attributes: order_id, sku) |

**Note:** Real traces may have missing causal parents, clock skew, dropped spans. Adapter marks confidence LOW when causal parents missing.

---

## Payload Validation (Static Gate)

Verifier static gate checks:
- All required fields present
- `event_id` is valid UUIDv4
- `trace_id` matches `stream_keys.order_id`
- `service` matches expected service for `type`
- `causal_parent_ids` all exist in same trace (or empty for root)
- `logical_clock` > all causal parents' clocks
- `delivery_seq` > all causal parents' seq