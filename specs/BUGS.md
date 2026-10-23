# InvariantLens Specifications: Bug Catalog

**Version:** 3  
**Total:** 13 bug instances = 6 classes × 2 variants (A for building, B for testing) + 1 blind-spot bug  
**Principle:** Variant A used during development; Variant B held out until benchmark (Day 6). Blind-spot violates no declared invariant.

---

## Bug Classes (6 Classes, 2 Variants Each)

| Class | Variant | Description | Root Cause | Violated Invariant | Known-Correct Fix |
|-------|---------|-------------|------------|-------------------|-------------------|
| **C1: Missing Compensation** | A | Order placed → Payment captured → Inventory **fails** → No compensation (payment not refunded) | Inventory emits `InventoryRejected` but Payments never receives compensation command | INV-001 (Response) | Add compensation saga: on `InventoryRejected`, emit `RefundPayment` |
| | B | Order placed → Payment captured → **Orders service crashes** before confirming → No rollback | Orders crashes after PaymentCaptured, never emits OrderConfirmed or triggers refund | INV-001, INV-002 | Persist order state; on recovery, check for uncommitted payments and compensate |
| **C2: Last-Item Race** | A | Two orders for last item (stock=1) → Both pass inventory check → Both reserve → **Over-reservation** | Check-then-act race in Inventory; no atomic reservation | INV-006 (StockConservation) | Atomic compare-and-swap reservation; or per-SKU mutex |
| | B | Order A reserves last item → Order B **cancels** → Inventory releases → Order C tries to reserve released item but **stock not updated** | InventoryReleased not emitted on cancellation; stock conservation broken | INV-006 | Emit `InventoryReleased` on order cancellation; update available count |
| **C3: Idempotency (Retry Double-Charge)** | A | Payment gateway timeout → Client retries → **Two PaymentCaptured** for same order | No idempotency key on PaymentCaptured; Payments treats each request as new | INV-003 (AtMostOne) | Require idempotency key on PaymentCaptured; deduplicate |
| | B | InventoryReserved **duplicate delivery** (scheduler bug) → Two InventoryReserved for same order → Double reservation | Scheduler delivers same message twice; Inventory not idempotent | INV-003 (per-SKU) | Make InventoryReserved idempotent via order_id + sku deduplication |
| **C4: Event Ordering** | A | PaymentCaptured emitted **before** InventoryReserved → OrderConfirmed → Inventory fails later | Payments doesn't wait for InventoryReserved; emits immediately | INV-002 (Precedence) | Payments waits for InventoryReserved (or timeout) before capturing |
| | B | OrderConfirmed emitted **before** PaymentCaptured (race in Orders) | Orders confirms on OrderPlaced alone; doesn't wait for payment | INV-002 | Orders waits for PaymentCaptured before OrderConfirmed |
| **C5: Swallowed Error** | A | Inventory internal error → **Catches exception, emits nothing** → Order hangs forever | Try-catch swallows error; no InventoryRejected emitted | INV-001 (Response) | Catch → emit InventoryRejected with error reason → rethrow if needed |
| | B | Payments gateway error → **Logs error, returns success to caller** → No PaymentCaptured/Failed | False success returned; downstream assumes payment succeeded | INV-001, INV-002 | Return actual gateway result; emit PaymentFailed on error |
| **C6: Lost Message** | A | OrderPlaced **dropped by scheduler** (simulated network partition) → No downstream events | Message dropped; no retry/outbox pattern | INV-001 (Response) | Outbox pattern: persist events locally, relay with retry |
| | B | InventoryReserved **dropped after emit** → Orders never receives it → Order times out | Message lost post-emit; no acknowledgment | INV-001, INV-002 | Acknowledgment + redelivery; or event sourcing with replay |

---

## Blind-Spot Bug (Test-Only, Held Out)

| ID | Class | Description | Why Missed |
|----|-------|-------------|------------|
| **BS-001** | Silent Data Corruption | Inventory **reserves correct quantity but wrong SKU** (payload bug: SKU field swapped) → Order for SKU-A reserves SKU-B stock | No invariant checks **payload correctness** — only event presence/order. StockConservation holds per-SKU but for wrong SKU. |

**Expected result:** InvariantLens **misses this bug**. Report as a miss in benchmark. Measures coverage honestly.

---

## Per-Bug Ground Truth Record (Committed Day 2)

For each bug instance, record before injection:

```json
{
  "bug_id": "C1_A",
  "class": "Missing Compensation",
  "variant": "A",
  "root_cause_event": {
    "event_id": "evt-inv-rejected-001",
    "service": "Inventory",
    "type": "InventoryRejected",
    "trace_id": "order-12345"
  },
  "violated_invariant": "INV-001",
  "known_correct_fix": "Add compensation saga: on InventoryRejected, emit RefundPayment",
  "fix_location": "services/payments/compensation.py",
  "oracle_hash": "<commit-hash-of-hidden-oracle>"
}
```

**Commit the oracle hash on Day 2 (Thu Oct 22) and publish after benchmark runs.**

---

## Bug Injection Flags

Each bug behind a feature flag:
```python
BUG_FLAGS = {
    "C1_A": False, "C1_B": False,
    "C2_A": False, "C2_B": False,
    "C3_A": False, "C3_B": False,
    "C4_A": False, "C4_B": False,
    "C5_A": False, "C5_B": False,
    "C6_A": False, "C6_B": False,
    "BS_001": False,  # blind-spot
}
```

Enable one at a time for development; all test variants enabled only during benchmark.

---

## Healthy Baseline

- 200 seeds, all invariants TRUE/VACUOUS
- End state: OrderConfirmed, PaymentCaptured, InventoryReserved
- No pending violations at trace closure