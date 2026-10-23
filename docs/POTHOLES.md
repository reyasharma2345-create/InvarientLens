# InvariantLens: Potholes & Mitigations

**Version:** 3  
**Rows marked [NEW] were not in v1.**

---

| # | Pothole | Evidence | How We Cover It |
|---|---------|----------|-----------------|
| 1 | **Invariants must come from somewhere** | Real business rules usually undocumented. Declare-style miners score candidate rules by support/confidence on logs. | **Hybrid:** Model proposes in template grammar only → statistics on healthy traces filter → human approves in UI. Report precision/recall against hand-labeled set. |
| 2 | **LLM diagnoses lose or ignore evidence** | OpenRCA (ICLR 2025): best model + purpose-built agent solved 11.34% of 335 failures. 2026 analysis: needed evidence usually present but unused. | **Deterministic citation validator:** hypotheses compiled to executable queries, refuted by code. Do not compare simulator numbers with OpenRCA. |
| 3 | **Agent picks the first anomaly** | First suspicious event often a symptom, not root cause. | **Divergence defined on manifest graph** from violated rule, not from first error log. |
| 4 | **Reproducing tests are hard to generate** | SWT-Bench: direct prompting 3.6% (Lite), best agent 19.2%; AssertFlip 43.6% (Verified). Those are natural-language issues in real repos. | **We replay a recorded trace** (easier). Use pass-then-invert. Validate 5/5 failures on buggy + pass on fixed. Measure our own rate. |
| 5 | **A single failing test covers one symptom** | Patches can fix the symptom only. | **Assert the invariant**, then sweep thousands of randomized schedules. |
| 6 | **Patch overfitting** | PatchDiff (ICSE 2026): 7.8% of SWE-bench "solved" patches failed dev tests; 29.6% behaved differently from reference. SWE-ABS: 19.78% of top-agent "solved" patches semantically incorrect. | **Hidden oracle scores every arm.** Report verifier false-accept rate, not only how many patches it rejected. |
| 7 | **Weak existing test suites** | STING: 77% of SWE-bench Verified instances had mutated variant of correct patch that still passed tests. | **Run mutation testing on demo suite**, report mutation score, add tests that kill survivors. (Should) |
| 8 | **[NEW] Patches that game the detector** | A patch can suppress trigger event, edit tests/invariants, or delete behavior so rule holds vacuously. | **Static gate** (allowed paths, no removed emissions, diff cap) + **vacuity check** + **happy-path golden equality** + **hidden oracle**. |
| 9 | **[NEW] "Eventually" on an open trace** | Response-style rules cannot be decided while workflow still running. | **Trace-closure rule:** report pending vs permanent violations (four-valued semantics). |
| 10 | **[NEW] Races cannot be replayed from a log** | A real log lacks the delivery order that caused the race. | **Seeded scheduler records delivery order**; repro test replays it; must fail 5/5. |
| 11 | **[NEW] Cross-order invariants** | "Last item" race spans two orders. | **Per-SKU streams** + stock-conservation rule, not only per-order traces. |
| 12 | **Causal claims under concurrency & retries** | Eventual consistency makes "the cause" ambiguous. | **Logical clocks + causal parents**, cautious wording, confidence level, alternatives shown. |
| 13 | **Real telemetry is messy** | Missing IDs, clock skew, dropped events, polyglot services. | **Real-trace proof on OTel Demo traces**; confidence drops when causal parents missing; UI says why. Diagnosis only — no repair claim on demo app. |
| 14 | **Self-made benchmark looks rigged; circular scoring** | See Section 7 (Benchmark Design). | **Spec-first invariants**, hidden oracle with committed hash, dev/test split, control fix, equal-budget baseline, per-bug results. |
| 15 | **Nebius looks decorative** | Milliseconds-per-test runs fit on a laptop. | **Large sweeps, isolation of AI-written code**, measured local-vs-Nebius comparison (Section 5 of ARCHITECTURE.md). |
| 16 | **[NEW] Job startup latency** | Job creation takes minutes. | **Batch jobs, fan-out, timing measured Day 1**, provisioning shown in UI. |
| 17 | **[NEW] Rate limits & credit burn** | Dynamic Token Factory limits; ~$50 credit. | **Cache, backoff, concurrency limiter, per-run cost log, budget computed before benchmark.** |
| 18 | **Live demo failure; hosting until Dec 15** | Project must stay free & available through judging. | **Replay mode** from real recorded runs + recorded backup video + hosting cost check Day 1. |
| 19 | **Security of running generated code** | AI-written patches untrusted. | **One throwaway VM per job**; inject no API keys into verifier jobs; results through results-only bucket. State egress behavior only after testing. [verify] |
| 20 | **Overclaiming** | One inflated claim discredits the rest. | **"Evidence-backed", not "proof". "Injected logic bugs", not "zero-day". "Prototype", not "production-ready". No "Nebius-accelerated" claim without your numbers.** |
| 21 | **[NEW] Crowded track (~24,400 registrants)** | Many general coding agents will compete. | **Lead with verification-first loop, honest benchmark, blind-spot result.** |
| 22 | **[NEW] Rules traps** | License must be visible in About; video public <3min; no copyrighted music/trademarks; English. | **Section 11 checklist**, tested in private window. |

---

## Mitigation Status Tracking

| # | Status | Notes |
|---|--------|-------|
| 1 | ✅ Designed | Rule Copilot spec in SPECS/INVARIANTS.md |
| 2 | ✅ Designed | Citation validator in ARCHITECTURE.md |
| 3 | ✅ Designed | Manifest-based divergence in ARCHITECTURE.md |
| 4 | ✅ Designed | Pass-then-invert in ARCHITECTURE.md |
| 5 | ✅ Designed | Invariant assertion + sweep in ARCHITECTURE.md |
| 6 | ✅ Designed | Hidden oracle in ARCHITECTURE.md + BENCHMARK_DESIGN.md |
| 7 | 📋 Should | Mutation testing if time |
| 8 | ✅ Designed | Static gate + vacuity + golden equality in ARCHITECTURE.md |
| 9 | ✅ Designed | Four-valued semantics in SPECS/INVARIANTS.md |
| 10 | ✅ Designed | Seeded scheduler + delivery_seq in SPECS/EVENT_SCHEMA.md |
| 11 | ✅ Designed | Per-SKU scope + INV-006 in SPECS/INVARIANTS.md |
| 12 | ✅ Designed | Logical clocks + confidence in ARCHITECTURE.md |
| 13 | ✅ Designed | OTel adapter + confidence in ARCHITECTURE.md |
| 14 | ✅ Designed | Benchmark protocol in BENCHMARK_DESIGN.md |
| 15 | ✅ Designed | Measured comparison in ARCHITECTURE.md §17 |
| 16 | 📋 Day 1 Task | Measure submit-to-first-log 3× |
| 17 | 📋 Day 1 Task | Cache + budget calculator script |
| 18 | 📋 Day 1 Task | Hosting cost check; replay mode design |
| 19 | 📋 Verify | Egress behavior test before benchmark |
| 20 | ✅ Policy | Terminology locked in README.md |
| 21 | ✅ Strategy | Differentiation in README.md |
| 22 | ✅ Checklist | Section 11 of playbook |

---

## Emergency Procedures

| Scenario | Action |
|----------|--------|
| Nebius quota too low for 16 jobs | Reduce fan-out; increase seeds per job; document honestly |
| Token Factory rate limit hits | Backoff + cache; reduce concurrency; log as friction in FEEDBACK.md |
| Model structured-output fails | Fallback to regex parsing; retry with stricter schema; log |
| Real-trace adapter fails (Docker) | Skip; state "adapter untested on real data" in UI & video; never fake |
| Benchmark runs > 24h | Reduce seeds to 1 per bug/arm; keep dev/test split; report limitation |
| Video > 3 min | Cut narration; speed up demo segments; hard cap at 2:50 |
| Submission link breaks | Test in private window Day 9; have backup URLs ready |