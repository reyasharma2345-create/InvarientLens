# InvariantLens: Build and Winning Playbook

**Version 3** — Revised Oct 21, 2026  
Prepared for the **Nebius × NVIDIA Global AI Hackathon 2026**  
Submission deadline: **Thu Oct 29, 6:00 PM IST** (Fri Oct 30, 10:30 PM IST hard deadline)  
Track: **Coding and Agentic Engineering**

---

## One-Paragraph Pitch

Multi-service workflows can fail in a way no single service notices: each service reports success, yet the business result is wrong (payment captured, inventory never reserved, confirmation sent). **InvariantLens** watches the events of an event-driven workflow, detects when a business rule (an *invariant*, written as a Declare-style temporal constraint) is violated, finds the first point where the workflow diverged from its declared event flow, generates a deterministic reproducing test, proposes several candidate patches with **NVIDIA Nemotron** on **Nebius Token Factory**, and verifies each candidate in isolated **Nebius Serverless Jobs** against the reproducing test, thousands of randomized schedules, and the regression suite. Results are scored by a **hidden oracle** and compared with LLM-only baselines that get the same model and the same budget.

**Core claim to defend:** *Diagnoses backed by checkable evidence, repairs verified by experiment, results measured against a fair baseline.*

**Thesis in one line:** *Nemotron proposes, Nebius disposes.* The model suggests causes and fixes; parallel, isolated experiments decide.

**Headline result to aim for:** of the AI-written patches that pass the visible tests, how many does the verifier reject, and does the hidden oracle agree? Plan one funnel chart that shows it. Report whatever you measure, even if it is unflattering.

---

## What We Do Not Claim

- Novelty of invariants (Declare did that decades ago)
- Mathematical proof
- Production readiness

The contribution is the **closed loop** from a violated rule to a verified patch, with honest measurement.

---

## Differentiation in a Crowded Track

Most entries will be general coding agents. This one is a **verification-first loop** whose oracle is a business rule, not another model opinion.

---

## Repository Structure

```
InvariantLens/
├── docs/           # Project documentation
├── specs/          # Formal specifications (invariants, manifests, event schemas)
├── architecture/   # Architecture diagrams and design docs
├── phases/         # Phase-by-phase execution plans
├── benchmarks/     # Benchmark design, results, raw logs
├── ui/             # Signature UI (swimlane timeline, verdict board)
├── video/          # Video script, assets, final export
├── scripts/        # Utility scripts (smoke tests, helpers)
└── README/         # README skeleton and FAQ
```

---

## Quick Start (Post-Hackathon)

```bash
# Clone and setup
git clone <repo-url>
cd InvariantLens
pip install -r requirements.txt

# Run the simulator (healthy path)
python -m simulator.run --scenario healthy --seed 42

# Run a bug scenario
python -m simulator.run --scenario bug_missing_compensation --seed 42

# Run the full pipeline on one bug
python -m pipeline.run --bug missing_compensation_A --model ultra
```

---

## Hackathon Compliance Checklist

- [ ] Runs on Nebius Token Factory (Nemotron-3-Ultra, Nemotron-3-Super, Nemotron-3-Lightning/Nano)
- [ ] Uses Nebius Serverless Jobs for verification fan-out
- [ ] Public repo with Apache-2.0/MIT/MPL-2.0 license visible in About
- [ ] README documents model usage, Token Factory acceleration, other Nebius services
- [ ] Public YouTube video < 3 minutes
- [ ] Working demo URL (replay mode, stays up until Dec 15)
- [ ] Feedback on Nebius/NVIDIA tools (FEEDBACK.md)
- [ ] Submitted by Oct 29, 6 PM IST

---

## Key Documents

| Document | Purpose |
|----------|---------|
| `docs/HACKATHON_FACTS.md` | Verified facts about the hackathon (dates, rules, prizes) |
| `docs/ARCHITECTURE.md` | Full architecture with component diagrams |
| `docs/BENCHMARK_DESIGN.md` | Credibility engine: arms, protocol, metrics |
| `docs/POTHOLES.md` | Known risks and mitigations |
| `phases/PHASES.md` | Day-by-day execution plan with gates |
| `phases/SCHEDULE.md` | Dated schedule with cut order |
| `specs/INVARIANTS.md` | Spec-first invariants (Declare-style) |
| `specs/BUGS.md` | 13 bug instances with ground truth |
| `specs/EVENT_SCHEMA.md` | Event format, logical clocks, causal parents |
| `ui/SIGNATURE_SCREEN.md` | Swimlane timeline, evidence panel, verdict board spec |
| `video/VIDEO_SCRIPT.md` | 3-minute video storyboard |
| `README/FAQ.md` | Honest answers to judge questions |

---

## Team

Solo builder (Aditya Patange) — B.Tech Computer Engineering, VIT Pune  
Focus: Cybersecurity, AppSec, Mobile/Network security  
GitHub: https://github.com/aditya-p02

---

## License

Apache-2.0 (visible in repo About section)