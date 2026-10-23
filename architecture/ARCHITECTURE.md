# InvariantLens Architecture

**Version:** 3  
**Principle:** *The model suggests; deterministic code decides.* Every stage that gates a decision (invariant checking, citation validation, test validation, patch verification, scoring) is plain code, not model opinion.

---

## Component Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INVARIANTLENS PIPELINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │   SIMULATOR  │───▶│   DETECTOR   │───▶│  DIAGNOSIS   │───▶│ TEST GEN   │ │
│  │  (3 services)│    │  (invariants)│    │ (LLM + code) │    │ (replay)   │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └────────────┘ │
│        │                    │                    │                    │       │
│        ▼                    ▼                    ▼                    ▼       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ Event Log    │    │ Violated     │    │ Divergence   │    │ Repro Test │ │
│  │ (structured) │    │ Rule + Scope │    │ Point + Evid │    │ (pass-then-│ │
│  └──────────────┘    └──────────────┘    │ + Confidence │    │  invert)   │ │
│                                           └──────────────┘    └────────────┘ │
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │  PATCH GEN   │───▶│ STATIC GATE  │───▶│  VERIFIER    │───▶│  SCORING   │ │
│  │ (8 cands)    │    │ (diff cap,   │    │ (Nebius Jobs)│    │ (Hidden    │ │
│  └──────────────┘    │  no emit rm) │    │ • Repro 5/5  │    │  Oracle)   │ │
│                       └──────────────┘    │ • Vacuity    │    └────────────┘ │
│                                           │ • Sweep 1000s│          │        │
│                                           │ • Regression │          ▼        │
│                                           └──────────────┘    ┌────────────┐ │
│                                                                 │   UI/REPORT│ │
│                                           ┌──────────────┐    │ • Swimlane │ │
│                                           │ REAL-TRACE   │    │ • Verdict  │ │
│                                           │ ADAPTER      │    │ • Funnel   │ │
│                                           │ (OTel Demo)  │    └────────────┘ │
│                                           └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Simulator (Demo System)

**What:** Deterministic event-driven simulator with 3 services:
- **Orders** — emits `OrderPlaced`, consumes `PaymentCaptured`, `InventoryReserved`
- **Payments** — consumes `OrderPlaced`, emits `PaymentCaptured` / `PaymentFailed`
- **Inventory** — consumes `OrderPlaced`, emits `InventoryReserved` / `InventoryRejected`

**Bus:** In-process message bus with seeded scheduler controlling:
- Delivery order
- Delays
- Duplicates
- Drops

**Why a simulator?** Races, reorderings, and retries must be replayable on demand. A log of a real FastAPI/Redis system cannot reproduce a race deterministically.

**Optional:** Thin FastAPI wrapper for UI serving only.

**Call it:** "simulated event-driven system" everywhere — never pass off as production microservices.

---

## 2. Event Format

```
event_id           # UUID
trace_id           # Order ID (groups events by workflow)
stream_keys        # {order_id, sku} — for cross-order invariants
service            # Orders | Payments | Inventory
type               # Event type (OrderPlaced, PaymentCaptured, ...)
logical_clock      # Lamport timestamp
wall_ts            # Wall-clock (may be skewed — never reason over this alone)
causal_parent_ids  # List of event_ids that causally precede this
delivery_seq       # Scheduler delivery sequence number
payload            # JSON payload
```

**Reason over:** Logical clocks + causal parents. Never wall-clock alone.

---

## 3. Service Manifests

Each service declares:
- What it **consumes** (event types)
- What it **emits** (event types)
- What it **owes downstream** (e.g., Inventory consumes `OrderPlaced` and **must** emit `InventoryReserved` or `InventoryRejected` in the same trace)

Together they form the **expected event-flow graph** used to locate divergence.

---

## 4. Invariant Registry

**Declare-style templates** (written from business spec BEFORE any bug injection):

| Template | Example |
|----------|---------|
| **Precedence** | `PaymentCaptured` precedes `OrderConfirmed` |
| **Response** | `OrderPlaced` → eventually `InventoryReserved` \| `InventoryRejected` |
| **AtMostOne** | At most one `PaymentCaptured` per order |
| **NotSuccession** | `InventoryRejected` not followed by `OrderConfirmed` |
| **CoExistence** | `OrderPlaced` ↔ `PaymentCaptured` (both or neither) |
| **StockConservation** | Per-SKU: `Reserved + Available = InitialStock` (cross-order!) |

**Scopes:** Per-order AND per-SKU (v1 only had per-order — cannot express "two orders reserved the last item")

**Finite-trace semantics:** "Eventually" only decidable when trace is closed (terminal state or scheduler quiescence). Report violation as **pending** until closure, **permanent** afterwards (four-valued runtime verification).

---

## 5. Real-Trace Adapter

Converts OpenTelemetry trace exports (OTLP / Jaeger JSON) → same event format:
- Span → Event
- Parent span → Causal parent
- Trace ID → trace_id

**Target:** OpenTelemetry Demo (real multi-service shop with built-in fault flags, e.g., `cartServiceFailure` makes `EmptyCart` calls fail, breaking "order placed → cart emptied")

**Diagnosis only.** Demo is polyglot; repair verification stays on simulator. Say so on screen.

**Fallback if Docker too heavy:** Skip, state adapter untested on real data. **Never fake traces.**

---

## 6. Rule Copilot (Should)

Plain English → Declare-style constraint:
1. Model drafts in fixed template grammar
2. Code parses, runs on healthy traces, shows match count
3. Human approves

**No rule mining in v3.**

---

## 7. Violation Detector

Evaluates registry over closed traces and streams; emits:
- Violated rule
- Scope (order_id / sku)
- Triggering events

---

## 8. Causal Analyzer

**First divergence point** = walk manifest graph along actual causal parents from trigger; first node whose declared obligation is unmet (missing emit, wrong order, duplicate).

**LLM drafts competing hypotheses** → each turned into executable query over event graph (e.g., "Inventory consumed the command but emitted nothing") → refuted or kept by code.

**Citation validator** rejects any claim whose event IDs:
- Don't exist
- Belong to another trace
- Don't match claimed event type

**Output:**
- Violated rule
- Divergence event ID
- Evidence IDs
- Rejected alternatives with refuting IDs
- Confidence (LOW when causal parents missing or clocks conflict)

---

## 9. Test Generator (Replay Harness)

**Pass-then-invert:**
1. Make replay harness run to completion and **pass** on buggy behavior
2. Invert to **assert the invariant**

**Validation:** Fails on buggy version 5/5 runs, passes on known-correct/healthy version. Discard otherwise; retry with feedback up to 3×.

---

## 10. Patch Generator

**8 candidates per failure**, drawn with different strategies from diagnosis + relevant code + failing test:
1. Compensation
2. Idempotency key
3. Ordering guard
4. Outbox / retry
5. State-machine fix
6. (2 more strategy variants)

---

## 11. Verifier (Nebius Serverless Jobs)

**Per candidate, in order:**
1. **Static gate:** Applies cleanly; touches only service code (never tests, invariants, manifests, event schema); no removal of event emission; diff-size cap; no new network/subprocess imports
2. **Repro test passes 5/5**
3. **Vacuity check:** Invariant satisfied non-vacuously (trigger still occurs, consequent occurs)
4. **Randomized sweep:** Thousands of seeds across families: reorder, duplicate-delivery, retry, fault-at-step-k, crash-restart
5. **Regression suite** + happy-path golden end-state equality

**Selection:** Passing candidate with smallest behavioral diff. If none passes, report shrunk counterexample honestly.

---

## 12. Hidden Oracle

**Scoring only — never visible to pipeline:**
- Separate test suite
- Extra scenario families
- Seeds disjoint from verifier's
- Differential test against known-correct fix

**Commit its hash before first benchmark run.**

---

## 13. Report & UI (Signature Screen)

**One signature screen:**
- **Swimlane timeline** (one lane per service) with divergence point marked
- **Evidence panel** with cited events and refuted alternatives
- **Generated test**
- **Verdict board:** Each candidate = card turning red/green with reason (e.g., "rejected: removes PaymentCaptured emission" or "counterexample: seed 1842, duplicate delivery") + button to replay shrunk counterexample
- **Job IDs and timings**
- **One funnel chart**

---

## 14. NVIDIA Model Usage

| Step | Model | Price/1M | Why |
|------|-------|----------|-----|
| Diagnosis hypotheses, patch generation | Nemotron-3-Ultra-550b-a55b (1M ctx) | $1.00 in / $3.00 out | Hardest reasoning; hackathon points to Ultra |
| Test generation, report text | Nemotron-3-Super-120b-a12b | $0.30 in / $0.90 out | Cheaper, fast, long context |
| Invariant suggestions, summaries, bulk | Nemotron-3.5-Lightning or Nemotron-3-Nano-30B-A3B | $0.06 in / $0.24 out | High volume, low cost |

**Confirm IDs, structured-output support, context limits in Token Factory console on Day 1. Pin in README.**

---

## 15. LLM Call Discipline

- JSON-schema outputs, parsed & validated; reject & retry on parse failure
- Cache every call keyed by `model + prompt_hash`; log tokens, latency, cost (cache = demo fallback)
- Token Factory rate limits: dynamic, in `x-ratelimit-*` headers → retry with backoff + global concurrency limiter
- Check Batch API (50% discount, higher limits) for independent candidate generations
- **Budget:** ~$50 credit. After Day 1, measure tokens/pipeline run, compute bugs × arms × seeds × calls before benchmark.

---

## 16. Nebius Serverless Jobs: Design Consequences

| Doc Fact | Design Consequence |
|----------|-------------------|
| Each job = own container VM, billed while running, deleted on end | No state survives. Write results to mounted bucket/volume |
| Job creation "usually takes a few minutes" | Per-candidate jobs spend life provisioning. **Use 1 job/batch (8-16 jobs fan-out). Show provisioning honestly in UI. Measure submit-to-first-log 3× on Day 1.** |
| CPU platforms exist (cpu-d3, cpu-e2) | pytest verification needs no GPU. Pick via `nebius compute platform list`. Keep inference on Token Factory. |
| Job timeout: min 1h, max 168h, default 24h | Always set explicit timeout + in-container watchdog |
| Injected files read-only, 64 KiB each | Patch + test fit as injected files. Larger → bucket volume |
| Logs only in web console/CLI, not REST API | Runner writes structured `result.json` to bucket AND prints it. UI reads JSON. |
| Images from public registry or Nebius Container Registry | Bake runner image with pinned deps + simulator. Use `nebius ai job create` (stable; `job run` is beta). Check CLI version (≥0.12.277 per skills repo) |
| Quotas exist (vCPU, public IP for SSH) | Check vCPU quota Day 1. 16-job fan-out may exceed new project default. |
| Serverless Endpoints can host app | Host replay UI as static site or small CPU endpoint. Confirm cost (must stay up until Dec 15). |

---

## 17. "Why Nebius?" — Honest Answer (3 Parts, All Measured)

1. **Scale:** 8 candidates × thousands of seeds × 5 scenario families × 13 bugs = needs parallel workers. Report wall-clock: 1 local worker vs Nebius fan-out (including provisioning). If local wins at small sizes, say so and show crossover.
2. **Isolation:** AI-written code runs in throwaway VMs with no API keys.
3. **Token Factory:** Serves every Nemotron call with logged counts, latency, cost.

---

## 18. Security

- AI-written patches = untrusted
- One throwaway VM per job
- Inject **no API keys** into verifier jobs
- Results through results-only bucket
- State egress behavior only after testing it