# InvariantLens Signature Screen Specification

**Version:** 3  
**Principle:** One polished flow beats five rough ones. This is the screen judges will remember.

---

## Layout Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  INVARIANTLENS                        [Scenario: C1_A]    [Run ID: abc123]   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                    SWIMLANE TIMELINE                                    │  │
│  │  ┌─────────┬─────────────────────────────────────────────────────────┐ │  │
│  │  │ Orders  │  ● OrderPlaced ◀────────────────────────────────────   │ │  │
│  │  │         │                                                         │ │  │
│  │  │         │                              ● OrderConfirmed ✗        │ │  │
│  │  │         │                              ▲ DIVERGENCE HERE         │ │  │
│  │  ├─────────┼─────────────────────────────────────────────────────────┤ │  │
│  │  │Payments │                    ● PaymentCaptured                    │ │  │
│  │  │         │                                                         │ │  │
│  │  │         │                              ✗ RefundPayment MISSING   │ │  │
│  │  ├─────────┼─────────────────────────────────────────────────────────┤ │  │
│  │  │Inventory│                          ● InventoryRejected           │ │  │
│  │  └─────────┴─────────────────────────────────────────────────────────┘ │  │
│  │  Time ──────────────────────────────────────────────────────────────▶  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  EVIDENCE PANEL                                    VERDICT BOARD             │
│  ┌────────────────────────┐   ┌────────────────────────────────────────┐    │
│  │ Violated Rule: INV-001 │   │  Candidate Patches (8 total)           │    │
│  │ Scope: order-12345     │   │  ┌──────────────────────────────────┐  │    │
│  │ Verdict: FALSE         │   │  │ 🟢 Patch #3: Compensation Saga   │  │    │
│  │ Confidence: HIGH       │   │  │    PASSED: Repro 5/5, Sweep,     │  │    │
│  │                        │   │  │    Regression, Golden, Oracle    │  │    │
│  │ Trigger: evt-001       │   │  │    Diff: +12 lines               │  │    │
│  │ (OrderPlaced)          │   │  │    [Replay Counterexample]       │  │    │
│  │                        │   │  └──────────────────────────────────┘  │    │
│  │ Cited Evidence:        │   │  ┌──────────────────────────────────┐  │    │
│  │  • evt-002 PaymentCaptured   │  │ 🔴 Patch #1: Removes emit      │  │    │
│  │  • evt-003 InventoryRejected │  │    REJECTED: Static gate       │  │    │
│  │  • (missing) RefundPayment   │  │    "Removes PaymentCaptured"   │  │    │
│  │                        │   │  │    [Replay Counterexample]       │  │    │
│  │ Refuted Alternatives:  │   │  └──────────────────────────────────┘  │    │
│  │  ❌ "Payment failed"   │   │  ┌──────────────────────────────────┐  │    │
│  │     Refuted by: evt-002 │   │  │ 🔴 Patch #7: Idempotency key   │  │    │
│  │  ❌ "Inventory ok"     │   │  │    REJECTED: Sweep             │  │    │
│  │     Refuted by: evt-003 │   │    Counterexample: seed 1842     │  │    │
│  │                        │   │    (duplicate delivery)          │  │    │
│  └────────────────────────┘   │  │    [Replay Counterexample]       │  │    │
│                               │  └──────────────────────────────────┘  │    │
│                               │  ... (5 more candidates)                │    │
│                               └────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────────────────┤
│  GENERATED TEST                                    FUNNEL CHART              │
│  ┌────────────────────────┐   ┌────────────────────────────────────────┐    │
│  │ def test_C1_A():       │   │  8  Candidates Generated               │    │
│  │     seed = 42          │   │  │                                     │    │
│  │     run(scenario=      │   │  ▼                                     │    │
│  │         "C1_A",        │   │  6  Static Gate Pass                   │    │
│  │         inject_faults  │   │  │                                     │    │
│  │     )                  │   │  ▼                                     │    │
│  │     assert invariant   │   │  4  Repro Test 5/5                     │    │
│  │     assert end_state   │   │  │                                     │    │
│  │                        │   │  ▼                                     │    │
│  │ # FAILS 5/5 on buggy   │   │  4  Vacuity Check Pass                 │    │
│  │ # PASSES on fixed      │   │  │                                     │    │
│  └────────────────────────┘   │  ▼                                     │    │
│                               │  2  Sweep Pass (1000s seeds)           │    │
│                               │  │                                     │    │
│                               │  ▼                                     │    │
│                               │  1  Regression + Golden Pass           │    │
│                               │  │                                     │    │
│                               │  ▼                                     │    │
│                               │  1  HIDDEN ORACLE PASS  ✅             │    │
│                               └────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────────────────┤
│  JOB DETAILS                                                REAL-TRACE TAB   │
│  ┌────────────────────────┐   ┌────────────────────────────────────────┐    │
│  │ Job ID: job-abc123     │   │  [OpenTelemetry Demo]                  │    │
│  │ Status: COMPLETED      │   │  Fault Flag: cartServiceFailure        │    │
│  │ Provisioning: 3m 12s   │   │  Detected: INV-001 violation           │    │
│  │ Runtime: 4m 33s        │   │  Confidence: MEDIUM (causal parents   │    │
│  │ Cost: $0.023           │   │  partially missing)                    │    │
│  │                        │   │  DIAGNOSIS ONLY — no repair attempted  │    │
│  │ Candidate: Patch #3    │   └────────────────────────────────────────┘    │
│  │ Seeds: 5000            │                                               │
│  └────────────────────────┘                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. Swimlane Timeline

**Visual:**
- One horizontal lane per service (Orders, Payments, Inventory)
- Events as colored dots on timeline with type labels
- Causal edges as curved arrows between lanes
- **Divergence marker**: Red ▲ at exact event where obligation unmet
- **Missing events**: Red ✗ with "MISSING" label at expected position
- **Hover**: Shows event_id, type, logical_clock, payload summary
- **Click**: Opens event detail in evidence panel

**States:**
- Loading: Skeleton lanes with shimmer
- Empty: "No events recorded" (should not happen for bug scenarios)
- Error: "Failed to load timeline" with retry button

### 2. Evidence Panel

**Sections:**
- **Violation Summary**: Rule ID, scope, verdict, confidence
- **Trigger Event**: event_id, type, timestamp, payload
- **Cited Evidence**: List of event_ids that support diagnosis, clickable
- **Refuted Alternatives**: Each with claim, refuting event_id, why it refutes
- **Confidence Reasoning**: "HIGH: all causal parents present, clocks consistent" or "LOW: 2 causal parents missing, clock skew detected"

**Interactions:**
- Click event_id → highlights in timeline
- "Show raw event" modal with full JSON

### 3. Verdict Board

**Candidate Card:**
```
┌─────────────────────────────────────────────────────────┐
│ Patch #3: Add compensation saga on InventoryRejected    │
│ Strategy: compensation  |  Diff: +12 lines  |  Service: Payments │
├─────────────────────────────────────────────────────────┤
│  🟢 PASSED                                              │
│  ├─ Repro Test: 5/5  ✅                                │
│  ├─ Vacuity: Non-vacuous  ✅                           │
│  ├─ Sweep: 5000 seeds  ✅                              │
│  ├─ Regression: 12/12  ✅                              │
│  ├─ Golden Equality:  ✅                               │
│  └─ Hidden Oracle:  ✅                                 │
│                                                         │
│  [View Diff]  [Replay Counterexample]  [View Job Log]  │
└─────────────────────────────────────────────────────────┘
```

**Rejection Reasons (exact strings to use):**
- "Static gate: removes PaymentCaptured emission"
- "Static gate: touches invariants file"
- "Static gate: diff exceeds 200 lines"
- "Static gate: adds network import"
- "Repro test: 3/5 passes on buggy"
- "Vacuity: trigger event no longer occurs"
- "Sweep: counterexample seed 1842 (duplicate delivery)"
- "Regression: broke test_orders_happy_path"
- "Golden: end-state mismatch (expected Confirmed, got Failed)"
- "Hidden oracle: failed differential test vs known-correct fix"

**Replay Counterexample Button:**
- Opens modal with same timeline but showing the failing seed's execution
- Slider to scrub through scheduler steps
- Highlights exact point of failure

### 4. Generated Test Display

- Syntax-highlighted Python code
- Copy button
- "Run locally" button (if local runner available)
- Shows validation status: "Validated: fails 5/5 buggy, passes fixed"

### 5. Funnel Chart

- Horizontal bar funnel (as shown in layout)
- Each stage shows count and percentage of previous
- Hover shows exact numbers
- Color: green for passing, red for dropping
- Final stage (Hidden Oracle) emphasized

### 6. Job Details

- Table with: Job ID, Status, Provisioning time, Runtime, Cost, Candidate, Seeds
- Link to Nebius console (if public)
- "Download result.json" button

### 7. Real-Trace Tab

- Only shown if real-trace adapter worked
- Same evidence panel but for OTel Demo trace
- Prominent banner: "DIAGNOSIS ONLY — no repair attempted on polyglot demo app"
- Confidence indicator with reason for any LOW/MEDIUM ratings

---

## Data Contract (JSON Input to UI)

The UI is built from **real recorded JSON** — never mocks. Schema:

```json
{
  "run_id": "abc123",
  "scenario": "C1_A",
  "timeline": {
    "events": [
      {"event_id": "evt-001", "service": "Orders", "type": "OrderPlaced", "logical_clock": 1, "delivery_seq": 1, "causal_parents": [], "payload": {...}},
      {"event_id": "evt-002", "service": "Payments", "type": "PaymentCaptured", "logical_clock": 2, "delivery_seq": 2, "causal_parents": ["evt-001"], "payload": {...}},
      {"event_id": "evt-003", "service": "Inventory", "type": "InventoryRejected", "logical_clock": 3, "delivery_seq": 3, "causal_parents": ["evt-001"], "payload": {...}}
    ],
    "divergence": {
      "event_id": "evt-003",
      "expected": ["RefundPayment"],
      "actual": []
    }
  },
  "violation": {
    "invariant_id": "INV-001",
    "scope": "per-order",
    "scope_key": "order-12345",
    "verdict": "FALSE",
    "confidence": "HIGH",
    "trigger_event_id": "evt-001",
    "cited_evidence": ["evt-002", "evt-003"],
    "refuted_alternatives": [
      {"claim": "Payment failed", "refuted_by": "evt-002"},
      {"claim": "Inventory ok", "refuted_by": "evt-003"}
    ]
  },
  "test": {
    "code": "def test_C1_A(): ...",
    "validation": {"buggy_5_of_5": true, "fixed_passes": true}
  },
  "candidates": [
    {
      "id": 3,
      "strategy": "compensation",
      "diff": "+12 lines",
      "service": "Payments",
      "stages": {
        "static_gate": true,
        "repro_test": {"passed": 5, "total": 5},
        "vacuity": true,
        "sweep": {"seeds": 5000, "passed": true},
        "regression": {"passed": 12, "total": 12},
        "golden": true,
        "oracle": true
      },
      "job_id": "job-abc123",
      "counterexample_seed": null
    },
    {
      "id": 1,
      "strategy": "remove_emit",
      "stages": {
        "static_gate": false,
        "rejection_reason": "Static gate: removes PaymentCaptured emission"
      },
      "counterexample_seed": null
    }
  ],
  "funnel": {
    "generated": 8,
    "static_gate": 6,
    "repro_test": 4,
    "vacuity": 4,
    "sweep": 2,
    "regression": 1,
    "oracle": 1
  },
  "jobs": [
    {"job_id": "job-abc123", "status": "COMPLETED", "provisioning_sec": 192, "runtime_sec": 273, "cost_usd": 0.023, "candidate": 3, "seeds": 5000}
  ],
  "real_trace": {
    "available": true,
    "source": "OTel Demo",
    "fault_flag": "cartServiceFailure",
    "violation": {...},
    "confidence": "MEDIUM",
    "confidence_reason": "2 causal parents missing"
  }
}
```

---

## Technical Notes

- **Framework**: React + TypeScript (or vanilla JS if simpler)
- **Charts**: Chart.js or D3 for funnel
- **Timeline**: Custom SVG/Canvas (not a library — needs precise control)
- **State**: All data loaded from single JSON file at `/api/run/<run_id>.json`
- **Replay mode**: Static JSON files for each benchmark run + real trace
- **Live mode** (optional, behind budget cap): POST to `/api/run` → streams job status via SSE

---

## Accessibility

- Semantic HTML
- Color-blind safe palette (no red/green only — use icons + text)
- Keyboard navigable
- ARIA labels on all interactive elements
- Focus visible
- Reduced motion respected

---

## Responsive

- Desktop: Full side-by-side layout
- Tablet: Stacked panels, timeline horizontal scroll
- Mobile: Not required (judges view on desktop) but timeline should scroll