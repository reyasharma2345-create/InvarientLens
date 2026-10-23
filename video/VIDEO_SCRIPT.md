# InvariantLens Video Script (3 Minutes Max — Target 2:50)

**Version:** 3  
**Principle:** The video IS the product. Judges may not watch past 3 minutes and may judge from video alone.

---

## Structure Overview

| Time | Duration | Segment |
|------|----------|---------|
| 0:00 – 0:20 | 20s | Hook: The Mystery |
| 0:20 – 0:40 | 20s | Insight: Why This Approach |
| 0:40 – 1:55 | 75s | Demo: Signature Screen Walkthrough |
| 1:55 – 2:15 | 20s | Real Traces: OTel Demo |
| 2:15 – 2:40 | 25s | Results: Funnel Chart + Nebius Numbers + Honest Failure |
| 2:40 – 2:50 | 10s | Close: Path to Production |

**Total: 2:50** (10s buffer)

---

## Segment 1: Hook (0:00 – 0:20)

**Visual:** Split screen — Customer view (order confirmed, payment taken) vs. Inventory dashboard (green, no reservation)

**Voiceover:**
> "Every dashboard was green. The customer was charged. The item was never reserved."

**On-screen text (bold, center):**
```
EVERY DASHBOARD GREEN
CUSTOMER CHARGED
ITEM NEVER RESERVED
```

**Visual:** Zoom into inventory service — no `InventoryReserved` event. Red alert: "INV-001 VIOLATED: OrderPlaced → InventoryReserved"

**Voiceover:**
> "No service noticed. The business rule — every order must reserve inventory — was silently broken."

---

## Segment 2: Insight (0:20 – 0:40)

**Visual:** Side-by-side comparison
- Left: "Traditional RCA" — logs → LLM guesses cause
- Right: "InvariantLens" — invariants → evidence → experiment

**Voiceover:**
> "Other tools guess causes from logs. InvariantLens checks business rules, finds the first break in the declared event flow, and tests its own fixes with real experiments."

**On-screen text (bullet points as spoken):**
```
✓ Business rules as checkable invariants (Declare-style)
✓ First divergence on manifest graph — not first error log
✓ Reproducing test validated: fails 5/5 on buggy, passes on fixed
✓ Candidate patches verified in isolated Nebius Jobs
✓ Scored by hidden oracle — not the verifier's own checks
```

**Voiceover (model specifics):**
> "Nemotron-3-Ultra on Token Factory proposes diagnoses and patches. Nemotron-3-Super generates tests. Nemotron-Lightning suggests invariants. Every model call logged, cached, and cost-tracked."

---

## Segment 3: Demo (0:40 – 1:55) — 75 seconds

**Pacing:** ~10s per beat. Use real recorded run (C1_A), not live.

### Beat 1: Timeline (0:40 – 0:50)
**Visual:** Swimlane timeline loads. Three lanes. Events appear with causal arrows.
**Action:** Hover divergence marker (red ▲).
**Voiceover:** "Here's the signature screen. Three services. The red marker shows where the workflow diverged from its declared obligations."

### Beat 2: Evidence Panel (0:50 – 1:00)
**Action:** Click marker → evidence panel opens.
**Voiceover:** "INV-001 violated: OrderPlaced should eventually lead to InventoryReserved or Rejected. The trigger was OrderPlaced. PaymentCaptured happened. InventoryRejected happened. But RefundPayment — the compensation — never emitted."

**Visual:** Evidence list with cited events. Refuted alternatives shown with red ❌.

### Beat 3: Generated Test (1:00 – 1:10)
**Action:** Scroll to generated test code.
**Voiceover:** "The system generates a replay test from the recorded trace. Pass-then-invert: it passes on the buggy behavior, then we invert to assert the invariant. Validated: fails 5 out of 5 times on buggy, passes on fixed."

### Beat 4: Verdict Board (1:10 – 1:35)
**Visual:** 8 candidate cards. Most red, one green.
**Voiceover:** "Eight candidate patches from different strategies. The verifier runs each in isolated Nebius Jobs — static gate, vacuity check, thousands of randomized schedules, regression suite."

**Action:** Click green card (Patch #3). Shows all checkmarks.
**Voiceover:** "Patch 3 adds a compensation saga. Passes everything including the hidden oracle."

**Action:** Click red card (Patch #1). Shows "Static gate: removes PaymentCaptured emission".
**Voiceover:** "Patch 1 removes the PaymentCaptured emission — static gate catches it instantly."

**Action:** Click red card (Patch #7). Shows "Sweep: counterexample seed 1842 (duplicate delivery)".
**Voiceover:** "Patch 7 adds an idempotency key. Passes visible tests but the randomized sweep finds a duplicate-delivery counterexample. The verifier rejects it. We can replay that exact seed."

**Action:** Click "Replay Counterexample" button → modal opens with timeline scrubber.
**Voiceover:** "One click replays the exact failing schedule. No guesswork."

### Beat 5: Funnel Chart (1:35 – 1:45)
**Visual:** Funnel animates: 8 → 6 → 4 → 4 → 2 → 1 → 1
**Voiceover:** "The funnel: 8 candidates. 6 pass static gate. 4 pass the reproducing test. 4 pass vacuity. 2 survive the sweep. 1 passes regression. 1 passes the hidden oracle."

### Beat 6: Job Details (1:45 – 1:55)
**Visual:** Job table with provisioning time, runtime, cost.
**Voiceover:** "Real Nebius Job IDs. Provisioning took 3 minutes. Runtime 4 minutes. Cost: 2 cents. Honest numbers."

---

## Segment 4: Real Traces (1:55 – 2:15)

**Visual:** Tab switch to "Real Trace". OTel Demo architecture diagram.
**Voiceover:** "Same detector on real telemetry. The OpenTelemetry Demo — a real multi-service shop we didn't write — with a fault flag enabled."

**Visual:** Evidence panel for real trace. Confidence: MEDIUM.
**Voiceover:** "It flags INV-001: cart failure breaks 'order placed → cart emptied'. Confidence is medium because causal parents are partially missing in real traces. This is diagnosis only — no repair on the polyglot demo."

**On-screen text:**
```
DIAGNOSIS ONLY
No repair attempted on polyglot demo app
```

---

## Segment 5: Results (2:15 – 2:40)

**Visual:** Benchmark results table (filled with measured numbers).

| Metric | A: Single-Shot | B: Best-of-N | C: InvariantLens |
|--------|----------------|--------------|------------------|
| Root Cause Match | 2/7 | 3/7 | **5/7** |
| Fix Passes Oracle | 1/7 | 2/7 | **4/7** |
| Visible Pass / Oracle Fail | 3 | 4 | **1** |
| Verifier Rejects Those | n/a | n/a | **1/1** |
| False Accepts | n/a | 1 | **0** |
| Blind-Spot Detected | 0/1 | 0/1 | **0/1** (honest miss) |

**Voiceover:** "The benchmark: 7 test bugs, 3 arms, equal compute. InvariantLens matches root cause on 5 of 7. 4 of 7 fixes pass the hidden oracle. Critical: only 1 patch passed visible tests but failed the oracle — and the verifier rejected it. Zero false accepts. The blind-spot bug — silent SKU corruption — was missed by all arms, as expected."

**Visual:** Wall-clock comparison bar chart (Local vs Nebius)
**Voiceover:** "Local wins at small scale. Nebius crosses over at ~50 parallel candidates. We measured it."

---

## Segment 6: Close (2:40 – 2:50)

**Visual:** Clean title card
```
InvariantLens
Explainable. Reproducible. Verifiably Fixable.
```

**Voiceover:**
> "Explainable diagnoses. Reproducible tests. Verifiably fixable patches. InvariantLens."

**On-screen (small):**
```
GitHub: github.com/aditya-p02/InvariantLens
Demo: invariantlens.dev
Models: Nemotron-3-Ultra/Super/Lightning on Nebius Token Factory
Compute: Nebius Serverless Jobs
```

---

## Production Notes

### Recording
- Record each segment separately
- Use 1080p minimum, 4K preferred
- Screen recording: OBS or built-in
- Voiceover: Record separately, sync in edit

### Editing
- Cut tight — no dead air
- Add captions (mandatory — works muted)
- No copyrighted music
- No third-party logos beyond incidental screen captures
- Color grading: consistent, professional

### Upload
- YouTube: Public
- Title: "InvariantLens: Verification-First Debugging for Event-Driven Systems | Nebius × NVIDIA Hackathon 2026"
- Description: Link to repo, demo, README
- Confirm length < 3:00
- Open in private/incognito window to verify

### Backup
- Export final MP4 to `/run/media/ghost/96EA3FE3EA3FBDF5/InvariantLens/video/final/`
- Keep project files in `/video/project/`
- Record a "backup video" (full unedited demo) for live demo failure scenario

---

## Caption File (SRT Format)

```
1
00:00:00,000 --> 00:00:05,000
Every dashboard was green.

2
00:00:05,000 --> 00:00:10,000
The customer was charged.

3
00:00:10,000 --> 00:00:15,000
The item was never reserved.

4
00:00:15,000 --> 00:00:20,000
No service noticed.

5
00:00:20,000 --> 00:00:30,000
Other tools guess causes from logs.

6
00:00:30,000 --> 00:00:40,000
InvariantLens checks business rules, finds the first break, and tests its own fixes.

7
00:00:40,000 --> 00:00:50,000
Here's the signature screen. Three services. The red marker shows the divergence.

8
00:00:50,000 --> 00:01:00,000
INV-001 violated. OrderPlaced should lead to InventoryReserved. Compensation missing.

9
00:01:00,000 --> 00:01:10,000
A replay test generated from the trace. Fails 5 of 5 on buggy. Passes on fixed.

10
00:01:10,000 --> 00:01:20,000
Eight candidate patches. Verified in isolated Nebius Jobs.

11
00:01:20,000 --> 00:01:35,000
Patch 3 adds compensation. Passes everything including the hidden oracle.

12
00:01:35,000 --> 00:01:45,000
The funnel: 8 candidates down to 1 verified by the hidden oracle.

13
00:01:45,000 --> 00:01:55,000
Real Nebius Jobs. Provisioning 3 minutes. Runtime 4 minutes. 2 cents.

14
00:01:55,000 --> 00:02:15,000
Same detector on OpenTelemetry Demo. Diagnosis only. Confidence medium — missing causal parents.

15
00:02:15,000 --> 00:02:25,000
Benchmark: 5 of 7 root causes matched. 4 of 7 fixes pass the hidden oracle.

16
00:02:25,000 --> 00:02:35,000
One patch passed visible tests but failed oracle. Verifier rejected it. Zero false accepts.

17
00:02:35,000 --> 00:02:40,000
Blind-spot bug missed by all arms. Honest measurement.

18
00:02:40,000 --> 00:02:50,000
Explainable. Reproducible. Verifiably Fixable. InvariantLens.
```

---

## Shot List (For Reference)

| Shot | Duration | Content |
|------|----------|---------|
| 1 | 5s | Customer view: "Order Confirmed" |
| 2 | 5s | Payment view: "Charged $99.99" |
| 3 | 5s | Inventory view: "All Green" (no reservation) |
| 4 | 5s | Red alert: INV-001 VIOLATED |
| 5 | 10s | Side-by-side: Traditional vs InvariantLens |
| 6 | 5s | Model badges: Ultra, Super, Lightning |
| 7 | 10s | Swimlane timeline loads |
| 8 | 5s | Hover divergence marker |
| 9 | 10s | Evidence panel open |
| 10 | 10s | Generated test code |
| 11 | 15s | Verdict board: green card details |
| 12 | 5s | Red card: static gate rejection |
| 13 | 5s | Red card: sweep rejection |
| 14 | 10s | Replay counterexample modal |
| 15 | 10s | Funnel chart animation |
| 16 | 10s | Job details table |
| 17 | 5s | Real trace tab |
| 18 | 10s | OTel Demo evidence panel |
| 19 | 15s | Benchmark results table |
| 20 | 10s | Wall-clock comparison |
| 21 | 5s | Title card: Explainable. Reproducible. Verifiably Fixable. |
| 22 | 5s | Links + credits |