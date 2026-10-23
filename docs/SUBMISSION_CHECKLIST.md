# InvariantLens Submission Checklist

**Version:** 3  
**Derived from Official Rules**  
**Target Submit:** Thu Oct 29, 6:00 PM IST  
**Hard Deadline:** Fri Oct 30, 10:30 PM IST

---

## Before You Build (Day 1)

- [ ] Rules, tracks, deadline (Oct 30, 10:00 AM PDT = 10:30 PM IST) and criteria written down; track chosen
- [ ] Credits claimed; model call, bucket write, and timed Nebius job tested end-to-end
- [ ] Public repo created with Apache-2.0/MIT/MPL-2.0 license **visible in About section**
- [ ] README skeleton naming models and Nebius services used

---

## During the Build (Days 2-8)

- [ ] One bug working end-to-end before widening (C1_A by Sat Oct 24 gate)
- [ ] Invariants written **before** bugs (Day 2)
- [ ] Hidden oracle hash committed (Day 2)
- [ ] Every model call and job logged and cached; per-run cost tracked
- [ ] FEEDBACK.md updated daily
- [ ] Features frozen on Oct 28 (Day 8)

---

## Before You Submit (Day 9 — Thu Oct 29)

### Benchmark & Results
- [ ] Benchmark table filled with **measured numbers only** (no invented numbers)
- [ ] Failure analysis slide done: which bugs failed and what they had in common
- [ ] Raw logs and job IDs published in repo
- [ ] Hidden oracle hash published

### Video
- [ ] Public on YouTube
- [ ] Under 3:00 (target 2:50)
- [ ] No copyrighted music
- [ ] No third-party trademarks beyond incidental screen captures
- [ ] Captions added (works muted)
- [ ] Shows Token Factory and Nemotron in use
- [ ] Link tested in private/incognito window

### Demo URL
- [ ] Works in private/incognito window
- [ ] Replay mode from real recorded runs (run IDs, job IDs visible)
- [ ] Optional "run live" behind hard budget cap + rate limit
- [ ] Stays up until Dec 15 (hosting cost confirmed Day 1)
- [ ] Testing instructions included

### README
- [ ] Setup instructions
- [ ] One-command run (e.g., `python -m pipeline.run --bug C1_A --model ultra`)
- [ ] Architecture diagram
- [ ] How Nemotron and Token Factory were used (which model for what)
- [ ] Other Nebius services used (Serverless Jobs, bucket, etc.)
- [ ] Pinned versions (model IDs, CLI version, dependencies)

### Feedback Section
- [ ] FEEDBACK.md complete with daily friction points
- [ ] Track selected: Coding and Agentic Engineering
- [ ] Text description complete
- [ ] "Not pre-existing" stated (or update explanation if applicable)

### Final Checks
- [ ] All submission text in English
- [ ] Every link tested in private/incognito window
- [ ] Submitted by **6:00 PM IST on Oct 29**
- [ ] Submission confirmed on Devpost

---

## Devpost Submission Fields

| Field | Value |
|-------|-------|
| Project Name | InvariantLens |
| Track | Coding and Agentic Engineering |
| Tagline | Verification-first debugging for event-driven systems: invariants detect the break, experiments verify the fix. |
| Description | [Copy from README.md one-paragraph pitch] |
| Demo URL | https://invariantlens.dev (or deployed URL) |
| Video URL | https://youtube.com/watch?v=... |
| Repo URL | https://github.com/aditya-p02/InvariantLens |
| License | Apache-2.0 |
| Feedback | [Link to FEEDBACK.md in repo] |
| Pre-existing? | No — built for this hackathon |

---

## Rules Traps (Double-Check)

- [ ] License visible in GitHub About (not just in repo root)
- [ ] Video public, under 3:00, no copyrighted music, no third-party trademarks
- [ ] All text in English
- [ ] Every link works in private window
- [ ] Submitted by 6 PM IST Oct 29 (not last hour)
- [ ] Feedback section exists
- [ ] Track correctly selected
- [ ] "Not pre-existing" stated

---

## Post-Submission (Oct 30 – Dec 15)

- [ ] Monitor demo URL uptime
- [ ] Respond to any judge questions (if platform allows)
- [ ] Prepare for winner announcement ~Jan 11, 2027

---

## Emergency Contacts / Links

| Item | Link / Info |
|------|-------------|
| Devpost Project | https://devpost.com/software/invariantlens |
| Devpost Rules | https://nebius-nvidia-global-ai-hackathon.devpost.com/rules |
| Devpost Resources | https://nebius-nvidia-global-ai-hackathon.devpost.com/resources |
| Nebius Console | https://console.nebius.com |
| Token Factory | https://tokenfactory.nebius.com |
| YouTube Studio | https://studio.youtube.com |
| GitHub Repo | https://github.com/aditya-p02/InvariantLens |