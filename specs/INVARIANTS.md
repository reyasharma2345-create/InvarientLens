# InvariantLens Specifications: Invariants

**Version:** 3  
**Principle:** Spec-first — invariants written from business spec **before any bug exists** (Day 2).  
**Language:** Declare-style templates over finite traces with four-valued runtime verification semantics.

---

## Invariant Registry (5-6 Rules)

All invariants written from the order-payment-inventory workflow specification on Day 2.

| ID | Template | Scope | Natural Language | Formal Sketch |
|----|----------|-------|------------------|---------------|
| **INV-001** | Response | Per-order | Every `OrderPlaced` is eventually followed by `InventoryReserved` OR `InventoryRejected` in the same trace | `OrderPlaced(o) → ◇(InventoryReserved(o) ∨ InventoryRejected(o))` |
| **INV-002** | Precedence | Per-order | `PaymentCaptured` must precede `OrderConfirmed` | `OrderConfirmed(o) → ◻(¬OrderConfirmed(o) W PaymentCaptured(o))` |
| **INV-003** | AtMostOne | Per-order | At most one `PaymentCaptured` per order | `¬(PaymentCaptured(o) ∧ ◇PaymentCaptured(o))` |
| **INV-004** | NotSuccession | Per-order | `InventoryRejected` must not be followed by `OrderConfirmed` | `InventoryRejected(o) → ◻¬OrderConfirmed(o)` |
| **INV-005** | CoExistence | Per-order | `OrderPlaced` and `PaymentCaptured` coexist (both or neither) | `OrderPlaced(o) ↔ PaymentCaptured(o)` |
| **INV-006** | StockConservation | **Per-SKU** (cross-order) | For each SKU: `Reserved + Available = InitialStock` at all times | `∀sku: Reserved(sku) + Available(sku) = InitialStock(sku)` |

---

## Scope Details

### Per-Order Scope
- Events grouped by `trace_id` (order ID)
- Invariants INV-001 through INV-005 evaluate within a single trace
- Closure: trace is closed when terminal state reached (OrderConfirmed, OrderFailed, or scheduler quiescence)

### Per-SKU Scope (Critical for Last-Item Race)
- Events grouped by `stream_keys.sku`
- INV-006 (StockConservation) spans **multiple orders** for the same SKU
- Detects: "Two orders reserved the last item" — impossible with per-order only
- State tracked via `InventoryReserved` (decrements available) and `InventoryReleased` (increments available)

---

## Finite-Trace Semantics (Four-Valued)

Following Maggi et al. / van der Aalst runtime verification:

| Verdict | Meaning |
|---------|---------|
| **TRUE** | Invariant satisfied; trace closed, consequent occurred |
| **FALSE** | Invariant violated; trace closed, consequent did not occur |
| **PENDING** | Trace not yet closed; "eventually" not yet decidable |
| **VACUOUS** | Trace closed; trigger never occurred (rule trivially true) |

**Implementation:**
- Detector evaluates incrementally as events arrive
- Reports **PENDING** violations while trace open
- On trace closure: promotes PENDING → TRUE/FALSE/VACUOUS
- UI shows pending vs permanent violations distinctly

---

## Violation Payload (What Detector Emits)

```json
{
  "invariant_id": "INV-001",
  "scope": "per-order",
  "scope_key": "order-12345",
  "verdict": "FALSE",
  "trigger_event_id": "evt-001",
  "trigger_event_type": "OrderPlaced",
  "expected_consequent": ["InventoryReserved", "InventoryRejected"],
  "actual_events_after_trigger": ["PaymentCaptured", "OrderConfirmed"],
  "trace_closed": true,
  "timestamp": "2026-10-21T10:00:00Z"
}
```

---

## Health Validation (Day 2 Gate)

Before any bug injection:
- Run simulator with 200 seeds on healthy path
- **All 6 invariants must evaluate to TRUE or VACUOUS on every seed**
- Any FALSE/PENDING on healthy = spec or simulator bug → fix before proceeding

---

## Invariants NOT in Scope (v3)

- Arbitrary temporal patterns beyond the 6 templates
- Quantitative timing constraints (e.g., "within 500ms")
- Data-value constraints beyond equality checks in payload
- Multi-SKU invariants beyond stock conservation

---

## Rule Copilot Output Format (Should)

If implemented, model outputs constrained to this grammar:

```
RULE ::= TEMPLATE "(" SCOPE "," TRIGGER "," CONSEQUENT ")"
TEMPLATE ::= "Response" | "Precedence" | "AtMostOne" | "NotSuccession" | "CoExistence" | "StockConservation"
SCOPE ::= "per-order" | "per-sku"
TRIGGER ::= EVENT_TYPE
CONSEQUENT ::= EVENT_TYPE ("|" EVENT_TYPE)*
EVENT_TYPE ::= "OrderPlaced" | "PaymentCaptured" | "PaymentFailed" | "InventoryReserved" | "InventoryRejected" | "InventoryReleased" | "OrderConfirmed" | "OrderFailed"
```

Code parses → runs on healthy traces → shows match count → human approves.