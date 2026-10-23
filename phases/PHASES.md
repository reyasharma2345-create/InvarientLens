# InvariantLens Phases: Day-by-Day Execution Plan

**Version:** 3  
**Timeline:** Wed Oct 21 – Thu Oct 29, 2026 (9 working days)  
**Real Deadline:** Thu Oct 29, 6:00 PM IST  
**Hard Deadline:** Fri Oct 30, 10:30 PM IST  

**Gate:** By end of **Saturday Oct 24**, Bug 1 (C1_A) must go from violation → locally verified patch. If not, apply cut order (Section 3 of playbook).

---

## Phase 0: Setup & Rule Check (Day 1 — Wed Oct 21)

### Goals
- Accounts, credits, model & job smoke tests
- Repo + license + track decision
- Start simulator skeleton

### Tasks
- [ ] Register on Devpost
- [ ] Claim credits: `NEBIUS-DEVPOST-GLOBAL26` ($25) + Builders Program ($25 + Tavily + Academy) — **verify amounts**
- [ ] Create Token Factory API key
- [ ] Create Nebius project, install CLI, log in (script token refresh — tokens expire ~12h)
- [ ] Call each model once with JSON-schema request:
  - Nemotron-3-Ultra-550b-a55b
  - Nemotron-3-Super-120b-a12b
  - Nemotron-3.5-Lightning or Nemotron-3-Nano-30B-A3B
  - Record confirmed IDs, context limits, structured-output issues
- [ ] Run hello-world CPU job **3×**; record:
  - Submit-to-first-log time
  - Submit-to-complete time
  - Write one result file to bucket
  - Screenshot quota page
- [ ] Create public repo with Apache-2.0 license **visible in About section**
- [ ] Add README skeleton naming models & Nebius services used
- [ ] Record track decision: **Coding and Agentic Engineering**
- [ ] Start `FEEDBACK.md` — log every friction point from now on

### Done When
- [ ] Model call works (all 3)
- [ ] Timed job works end-to-end (3 runs logged)
- [ ] License shows in repo About box
- [ ] README skeleton committed

---

## Phase 1: Simulator, Invariants & Bugs (Day 2 — Thu Oct 22)

### Goals
- Deterministic 3-service simulator complete
- 5-6 spec-first invariants written **before any bug**
- 6 bug classes × 2 variants + 1 blind-spot, behind flags with ground truth
- Hidden oracle hash committed

### Tasks
- [ ] Build message bus + seeded scheduler (controls delivery order, delays, duplicates, drops)
- [ ] Implement 3 services: Orders, Payments, Inventory (Python modules)
- [ ] Implement event format, logical clocks, causal parents
- [ ] Write **invariants first** from spec (INV-001 to INV-006)
- [ ] Implement invariant registry + detector (four-valued semantics)
- [ ] Implement service manifests (expected event-flow graph)
- [ ] Inject 13 bugs behind flags (C1_A…C6_B, BS_001)
- [ ] Record per-bug ground truth: root-cause event, violated invariant, known-correct fix
- [ ] Commit hidden oracle hash (separate test suite, extra scenarios, disjoint seeds, differential test)
- [ ] Healthy validation: 200 seeds, all invariants TRUE/VACUOUS

### Done When
- [ ] Healthy runs satisfy every invariant across 200 seeds
- [ ] Each bug yields a wrong end state
- [ ] Oracle hash committed to git

---

## Phase 2: Detection & Diagnosis (Day 3 — Fri Oct 23)

### Goals
- Trace closure rules
- Violation detector
- Manifest-based causal analyzer
- LLM hypotheses + executable refutation
- Citation validator
- Decide on Tavily (default: skip)

### Tasks
- [ ] Implement trace closure detection (terminal state + scheduler quiescence)
- [ ] Detector: evaluates registry over closed traces → emits violated rule, scope, trigger events
- [ ] Causal analyzer: walk manifest graph along causal parents from trigger → first unmet obligation
- [ ] LLM diagnosis: draft competing hypotheses (Nemotron Ultra, JSON-schema output)
- [ ] Executable refutation: each hypothesis → query over event graph → refuted/kept by code
- [ ] Citation validator: reject claims with non-existent/mismatched/trace-mismatched event IDs
- [ ] Output: violated rule, divergence event ID, evidence IDs, rejected alternatives + refuting IDs, confidence
- [ ] Confidence LOW when causal parents missing or clocks conflict

### Done When
- [ ] Each bug flags the right rule with a divergence point and validated evidence

---

## Phase 3: Reproduction & Verification (Day 4 — Sat Oct 24) — **GATE DAY**

### Goals
- Repro test generation (pass-then-invert)
- Patch generation (8 candidates)
- Static gate, vacuity check, local verifier
- **GATE: Bug 1 (C1_A) goes from violation → verified patch locally**

### Tasks
- [ ] Replay harness: record delivery order, injected faults, seed
- [ ] Pass-then-invert: harness passes on buggy → invert to assert invariant
- [ ] Validate: fails 5/5 on buggy, passes on healthy. Discard otherwise; retry ≤3× with feedback
- [ ] Patch generator: 8 candidates from diagnosis + code + failing test (strategies: compensation, idempotency key, ordering guard, outbox/retry, state-machine fix, 2 more)
- [ ] Static gate: applies cleanly; touches only service code; no emit removal; diff cap; no new network/subprocess imports
- [ ] Vacuity check: invariant satisfied non-vacuously (trigger occurs, consequent occurs)
- [ ] Local verifier: repro test 5/5 + randomized sweep (thousands of seeds) + regression suite + golden end-state equality
- [ ] Select passing candidate with smallest behavioral diff; if none, report shrunk counterexample

### Gate Criteria (Must Pass by End of Day)
- [ ] Bug C1_A: violation detected → divergence found → repro test valid → at least one patch passes local verifier
- [ ] If NOT: apply cut order immediately (drop Could, then Should items)

---

## Phase 4: Nebius Runner & Baselines (Day 5 — Sun Oct 25)

### Goals
- Runner image baked
- Nebius fan-out working
- Results bucket + timings
- Baseline B (and A if time)

### Tasks
- [ ] Bake runner image: pinned deps + simulator + verification harness
- [ ] Verify `nebius ai job create` works (CLI ≥0.12.277)
- [ ] Implement batch job runner: 1 job per batch, 8-16 jobs fan-out
- [ ] Results bucket: structured `result.json` per candidate + printed to logs
- [ ] Measure & log: job ID, candidate, stage results, seeds, seconds
- [ ] Implement Baseline A: single-shot Ultra call (logs+code → cause + 1 patch)
- [ ] Implement Baseline B: best-of-N with same token budget as C, candidates picked by regression suite only
- [ ] Log every model call & job (cache keyed by model+prompt_hash)

### Done When
- [ ] Verified patch comes back through Nebius with logged job IDs

---

## Phase 5: Benchmark & Real Traces (Day 6 — Mon Oct 26)

### Goals
- Run full benchmark on test variants (B variants + blind-spot)
- Capture OpenTelemetry Demo traces with cart fault flag
- Write real-trace adapter

### Tasks
- [ ] Freeze prompts, thresholds, model IDs; tag git commit **before** test variants run
- [ ] Benchmark protocol:
  - 7 test bugs (6 B variants + 1 blind-spot)
  - 3 arms (A, B, C)
  - 3 seeds per bug per arm (model temp > 0, sim seeds fixed)
  - Hidden oracle scores all
  - Control fix inserted in every run
- [ ] Run benchmark (may take hours — let it run)
- [ ] While runs go: capture OTel Demo traces with `cartServiceFailure` flag
- [ ] Write adapter: OTLP/Jaeger JSON → InvariantLens event format
- [ ] Run detector on real traces (diagnosis only — no repair)

### Done When
- [ ] Results table + raw logs exist
- [ ] One real trace flagged (or fallback decision documented)

---

## Phase 6: UI, Video & Submission (Days 7-9 — Tue Oct 27 – Thu Oct 29)

### Day 7 (Tue Oct 27) — UI Build
- [ ] Build signature screen from **real recorded JSON** (never mocks):
  - Swimlane timeline (1 lane/service) + divergence marker
  - Evidence panel (cited events, refuted alternatives)
  - Generated test display
  - Verdict board (candidate cards: red/green + reason + replay counterexample button)
  - Funnel chart
  - Real-trace page
  - Job IDs & timings
- [ ] Rule Copilot if time permits
- [ ] Re-read Rules page

### Day 8 (Wed Oct 28) — Feature Freeze & Polish
- [ ] **Feature freeze at start of day**
- [ ] Failure analysis: which bugs failed, what they had in common
- [ ] README complete: setup, one-command run, architecture diagram, model usage, Nebius services, pinned versions
- [ ] Record video (raw footage)

### Day 9 (Thu Oct 29) — Submit
- [ ] Re-record video if needed
- [ ] Devpost text + feedback section
- [ ] Test **every link in private/incognito window**
- [ ] Submit by **6:00 PM IST**
- [ ] Confirm submission on Devpost

---

## Cut Order (If Behind Schedule)

Apply strictly from bottom up at Saturday gate (or earlier if needed):

1. Drop every **Could** item (ablation, more bugs, live-run mode, Tavily)
2. Drop local-vs-Nebius comparison (keep one honest sentence)
3. Drop Rule Copilot
4. Drop blind-spot bug
5. Drop real-trace proof **last** (strongest Impact lever but riskiest)

**Never cut:**
- Hidden oracle
- Baseline B
- Nebius fan-out
- Signature UI (swimlane + verdict board + funnel)
- Video, README, submission

---

## Explicitly Out of Scope

- Arbitrary real company codebases, many languages, production-scale ingestion
- Repairing OpenTelemetry Demo itself (polyglot) — diagnosis only
- Proof of correctness — use "evidence-backed", never "proof"
- Training/fine-tuning models — Token Factory inference only
- Features outside the pipeline — scope discipline wins hackathons

---

## Team Roles (Solo)

| Role | Owner |
|------|-------|
| Simulator, bugs, oracle, benchmark | You |
| Analyzer, LLM stages, verifier, Nebius runner | You |
| UI, video, README, Devpost | You (start Day 3 against mock JSON schema) |

**Solo strategy:** Protect benchmark & submission (pieces solo builders neglect). Follow cut order strictly.