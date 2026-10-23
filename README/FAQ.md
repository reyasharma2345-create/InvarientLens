# InvariantLens FAQ (Honest Answers for Judges)

**Version:** 3  
**Principle:** No overclaiming. "Evidence-backed", not "proof". "Injected logic bugs", not "zero-day". "Prototype", not "production-ready".

---

## Where do the invariants come from?

**Hand-written from the business spec before bugs existed.** Optionally proposed by the model in a fixed template grammar, filtered by statistics on healthy traces, and approved by a human. We measured precision and recall on a hand-labeled set (Should item — reported if implemented).

The invariants are **spec-first** — written on Day 2, before any bug injection. This prevents circularity.

---

## Are invariants a new idea?

**No.** Declarative process mining and runtime verification have monitored business constraints on event logs for years (Declare templates, Maggi et al., van der Aalst et al.). Our contribution is not the invariant language — it's the **closed loop** from a violated rule to a verified patch, with honest measurement against a fair baseline.

---

## Is this a proof of correctness?

**No.** It is evidence-backed diagnosis with experimental verification. Strength depends on the scenarios and tests we ran. We use "evidence-backed", never "proof".

---

## Did you rig the benchmark?

**We tried not to.** Here's how:
- **Spec-first invariants** — written before bugs exist
- **Dev/test split** — variant A for building, variant B held out until benchmark
- **Equal-budget baseline** — Baseline B gets same model, same tokens, same candidate count
- **Hidden oracle** — separate test suite, extra scenarios, disjoint seeds, differential test; hash committed before runs
- **Control fix** — known-correct fix inserted in every run; false rejects reported
- **Blind-spot bug** — violates no declared rule; all arms miss it; reported honestly
- **Per-bug results** — not just aggregates; 95% CIs on proportions
- **Everything in the repo** — raw logs, job IDs, benchmark code

---

## Why Nebius? Couldn't this run on a laptop?

**Three measured reasons:**
1. **Scale** — 8 candidates × thousands of seeds × 5 scenario families × 13 bugs needs parallel workers. We report wall-clock: 1 local worker vs Nebius fan-out including provisioning. If local wins at small sizes, we say so and show the crossover.
2. **Isolation** — AI-written code runs in throwaway VMs with no API keys.
3. **Token Factory** — serves every Nemotron call with logged counts, latency, and cost.

We don't claim "Nebius-accelerated" without our numbers.

---

## Would this work on a real production system?

**Not yet.** It's a prototype on a simulator. Main obstacles:
- Messy telemetry (missing IDs, clock skew, dropped events)
- Missing service manifests (nobody writes them down)
- Weak test suites (STING: 77% of SWE-bench Verified had mutated correct patches that still passed)
- Ambiguous causality under heavy concurrency

The real-trace proof on OpenTelemetry Demo traces shows the detector works on real data — but **diagnosis only**, no repair claim.

---

## What if the patch is wrong?

The verifier rejected X patches the oracle also rejected, and accepted Y the oracle rejected (false-accepts). We report both numbers. A human reviews before any merge. The hidden oracle is the final arbiter — not the verifier.

---

## Why not just use a bigger LLM or an agent loop?

**Baseline B IS that loop** — same model, same compute, candidates picked by tests only. InvariantLens adds the invariant layer, reproducing test, static gate, vacuity check, randomized sweep, and hidden oracle scoring. The benchmark isolates what each component contributes.

---

## What's the "hidden oracle" and why should we trust it?

A **separate test suite** the pipeline never sees:
- Extra scenario families (beyond the 5 in the verifier)
- Seeds disjoint from the verifier's
- Differential test against the known-correct fix

Its hash was committed on Day 2 (Thu Oct 22) and published after runs. It scores **all arms equally** — including Baselines A and B. If the verifier rejects the control fix, that's a false reject and we report it.

---

## How do you handle "eventually" on an open trace?

**Finite-trace semantics** (four-valued, following Maggi et al.):
- **PENDING** — trace open, "eventually" not decidable yet
- **TRUE** — trace closed, consequent occurred
- **FALSE** — trace closed, consequent did not occur
- **VACUOUS** — trace closed, trigger never occurred

We report pending vs permanent violations distinctly in the UI.

---

## How do you replay races from a log?

**You can't.** A real log lacks the delivery order that caused the race. Our **seeded scheduler records the exact delivery order** (delivery_seq). The reproducing test replays it deterministically and must fail 5/5 times on the buggy version.

---

## What about cross-order invariants (the "last item" race)?

Per-order traces can't express "two orders reserved the last item." We use **per-SKU streams** and a **stock-conservation rule** (INV-006): `Reserved + Available = InitialStock` for each SKU across all orders.

---

## How do you make causal claims under concurrency and retries?

**Cautiously.** We use:
- Logical clocks (Lamport) + causal parents
- Confidence levels (HIGH/MEDIUM/LOW) based on causal parent completeness
- Refuted alternatives shown with the evidence that refutes them
- Never "the cause" — always "the first divergence on the declared event flow"

---

## What models do you use and why?

| Step | Model | Why |
|------|-------|-----|
| Diagnosis hypotheses, patch generation | Nemotron-3-Ultra-550b-a55b | Hardest reasoning; hackathon text points to Ultra |
| Test generation, report text | Nemotron-3-Super-120b-a12b | Cheaper, fast, long context |
| Invariant suggestions, summaries, bulk | Nemotron-3.5-Lightning or Nemotron-3-Nano-30B-A3B | High volume, low cost |

All on Nebius Token Factory. IDs, context limits, structured-output support confirmed Day 1 and pinned in README.

---

## How much did it cost?

~$50 in credits (Token Factory + Nebius Jobs). We track every call: model, tokens, latency, cost. Cache keyed by model+prompt_hash. Budget computed before benchmark. Numbers in the benchmark results.

---

## Is the demo live or replay?

**Replay mode** — real recorded runs with run IDs and job IDs, so judges can explore without spending our credits. Optional "run live" button behind hard budget cap and rate limit. Hosting cost checked Day 1; stays up until Dec 15.

---

## What's the license?

**Apache-2.0**, visible in the GitHub About section.

---

## Team size?

**Solo** (Aditya Patange — B.Tech Computer Engineering, VIT Pune). The plan works for 1-3 people; tiers decide what gets cut, not headcount. Solo strategy: protect benchmark & submission (pieces solo builders neglect). Follow cut order strictly.

---

## What did you cut?

If behind schedule, cut order applied at Saturday gate:
1. Could items (ablations, more bugs, live-run, Tavily)
2. Local-vs-Nebius comparison (kept one honest sentence)
3. Rule Copilot
4. Blind-spot bug
5. Real-trace proof (last — strongest Impact lever but riskiest)

**Never cut:** hidden oracle, Baseline B, Nebius fan-out, signature UI, video, README, submission.

---

## Where's the code?

Public repo: `github.com/aditya-p02/InvariantLens` (to be created Day 1)
- One-command run: `python -m pipeline.run --bug C1_A --model ultra`
- Architecture diagram in `architecture/ARCHITECTURE.md`
- Benchmark raw logs in `benchmarks/raw/`
- FEEDBACK.md with daily friction points