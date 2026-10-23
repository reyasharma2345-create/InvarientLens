# InvariantLens Benchmark Design (The Credibility Engine)

**Version:** 3  
**Principle:** A self-made benchmark can look rigged. This version fixes v1's two real flaws: (1) scoring fixes with the verifier's own checks, (2) giving InvariantLens hand-written invariants that already encode the bug.

---

## Arms (Three Arms, Equal Budget)

| Arm | Name | What It Does | What It Isolates |
|-----|------|--------------|------------------|
| **A** | Single-Shot | One Ultra call with logs + code → cause + one patch | Naive "LLM reads logs" baseline |
| **B** | Best-of-N, Tests Only | Same model, same candidate count, same token budget as C. Baseline may write its own test. Candidates picked by regression suite only. | What a typical agent loop achieves with equal compute — so verifier's gain isn't just "more samples" |
| **C** | InvariantLens | Full pipeline (invariants → detection → diagnosis → repro test → patch gen → verifier fan-out → hidden oracle scoring) | The complete system |

### Ablations (Should — Only If Time)

| Ablation | What's Removed | What It Shows |
|----------|----------------|---------------|
| C \ Invariant Layer | Use B's diagnosis, keep repro test + verifier | Gain from invariant-guided diagnosis |
| C \ Randomized Sweep | Keep static gate + vacuity + regression | Gain from randomized schedules |
| C \ Static Gate | Keep vacuity + sweep + regression | How many overfit patches static gate catches |

---

## Protocol (Rigour Checklist)

### 1. Invariants Before Bugs
- Rules written from spec on **Day 2 (Thu Oct 22)**, before any bug exists
- No peeking at bugs when writing invariants

### 2. Blind-Spot Bugs
- At least one bug (BS-001) violates **no declared rule**
- Report that InvariantLens misses it → measures coverage honestly

### 3. Dev/Test Split
- 6 bug classes × 2 variants = 12 + 1 blind-spot = 13 instances
- **Variant A** of every class: for building (Days 2-5)
- **Variant B** (different service, event, or timing): held out until benchmark **Day 6 (Mon Oct 26)**
- Blind-spot bug: test-only
- **Freeze prompts, thresholds, model IDs, tag git commit BEFORE test run**

### 4. Hidden Oracle
- Fix success judged by suite the pipeline **never sees**:
  - Separate tests
  - Extra scenario families
  - Disjoint seeds
  - Differential test against known-correct fix
- **Commit oracle hash on Day 2 (Thu Oct 22), publish after runs**

### 5. Control Fix
- Insert known-correct fix as a candidate in **every run**
- If verifier rejects it → **false reject**, must be reported

### 6. Pre-Defined Root-Cause Match
- Diagnosis matches if divergence event = ground-truth event, OR = (service, event type)
- Write this definition down **before runs**

### 7. Repeats
- 3 seeds per bug per arm (model temperature > 0, simulator seeds fixed)
- Report **per-bug results**, not only aggregates
- 95% confidence intervals on every proportion
- With ~7 test bugs: claim no statistical significance unless intervals support it

---

## Metrics Layout (Fill Only With Measured Numbers)

| Metric | A: Single-Shot | B: Best-of-N, Tests Only | C: InvariantLens |
|--------|----------------|---------------------------|------------------|
| **Root cause matches ground truth** | x / N | x / N | y / N |
| **Valid reproducing test** (fails 5/5 buggy, passes fixed) | n/a | n/a | y / N |
| **Fix passes hidden oracle** | x / N | x / N | y / N |
| **Headline: candidates passing visible tests but failing hidden oracle** | x | x | y |
| **Headline: of those, rejected by verifier** | n/a | n/a | y / x |
| **Verifier false-accepts** (accepted, oracle rejects) | n/a | x | y |
| **Control fix wrongly rejected** | n/a | n/a | y / N |
| **Blind-spot bugs detected** | n/a | n/a | y / N |
| **Wall-clock per bug (incl. provisioning)** | x | x | y |
| **Cost per bug** (tokens + job-seconds) | x | x | y |

### Should Metrics (If Time)

| Metric | A | B | C |
|--------|---|---|---|
| Invariant suggestions: precision / recall | n/a | n/a | p / r |
| Suite mutation score | n/a | n/a | m |

---

## Reporting Rules

1. **Report every number even if unflattering**
2. **Show failure analysis slide:** which bugs failed and what they had in common
3. **Publish benchmark, raw logs, job IDs** so anyone can rerun
4. **Do not invent numbers** — the table above is a layout, not a result
5. **No statistical significance claims** without interval support

---

## Funnel Chart (Signature Visual)

```
                    ┌─────────────────────┐
                    │  AI-Generated       │
                    │  Candidates (8/bug) │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Static Gate Pass   │
                    │  (diff cap, no rm)  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Repro Test 5/5     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Vacuity Check      │
                    │  (non-vacuous)      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Randomized Sweep   │
                    │  (1000s seeds)      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Regression +       │
                    │  Golden Equality    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  HIDDEN ORACLE      │
                    │  (disjoint tests)   │
                    └─────────────────────┘
```

**Key comparison:** How many pass visible tests but fail oracle? How many of those does verifier reject?

---

## Nebius Job Structure for Benchmark

- **1 job per batch** (not per candidate) — 8-16 jobs fan-out
- Each job runs: multiple candidates × thousands of seeds
- Job timeout: 2 hours (with in-container watchdog at 1.5h)
- Results → bucket as `result.json` + printed to logs
- UI reads bucket JSON, shows provisioning time honestly

---

## Baseline Implementation Details

### Baseline A (Single-Shot)
```python
prompt = f"""
Logs: {logs}
Code: {service_code}
Find the root cause and propose ONE fix.
Output JSON: {{"cause": "...", "patch": "..."}}
"""
# One Ultra call, parse, apply patch, run regression suite
```

### Baseline B (Best-of-N, Tests Only)
```python
# Same model, same total token budget as Arm C
# Generate N candidates (N = 8 to match C)
prompts = [varied_prompt_strategies() for _ in range(8)]
candidates = [call_model(p) for p in prompts]
# Filter: regression suite passes
passing = [c for c in candidates if regression_suite(c)]
# Pick one (e.g., smallest diff)
```

### Arm C (InvariantLens)
Full pipeline as specified in ARCHITECTURE.md

---

## Budget Calculation (Pre-Benchmark)

After Day 1 smoke tests, measure:
- Tokens per pipeline run (diagnosis + patch gen + test gen)
- Job-seconds per candidate batch

Then compute:
```
Total cost ≈ bugs × arms × seeds × (tokens × $/token + job_secs × $/sec)
```

With ~$50 credit, adjust seeds/arms if needed. **Replace estimates with measured numbers before Day 6.**