# AquaPulse: 2:30 Fallback Video Click Script (§11)

> **Execution Context:** Run from Tier-0 (`http://localhost:5173/?lite=1` with network disabled).
> **Rule:** Every display number carries a visible provenance dot (`LIVE`, `REPLAY`, `SYNTH`, `ASSUMPTION`, `USER`).

---

### [0:00 - 0:25] Beat 1 & 2 — "What They Said, What The Sky Saw"
- **Action (0:00):** Browser opens to `http://localhost:5173/?lite=1`.
- **Narration:** "AquaPulse verifies collective agricultural water use before allocation. Farmer claims and pump meter hours are synthetic benchmark profiles; satellite imagery and weather data carry verified dated provenance."
- **Action (0:06):** Press keyboard key `1` (or click "Beat 1").
  - Point to Wardha Zone-A bounding box and 4 synthetic farmer plots.
  - Initial Stress Gauge reads `89.2% (Semi-critical)`.
- **Action (0:12):** Press keyboard key `2` (or click "Beat 2").
  - Click **"🛡️ Prove It"** button in header.
  - The drawer slides open showing Sentinel-2 L2A scene ID (`S2A_MSIL2A_20261001`), dated acquisition (`2026-10-04`), and NDVI raster stats.
- **Action (0:22):** Click `✕` to close the Prove It drawer.

---

### [0:25 - 1:05] Beat 3 — "Verify: Flags, Never Auto-Cuts"
- **Action (0:25):** Press keyboard key `3` (or click "Beat 3").
  - Pumping columns ease to verified demand $U$.
  - Stress gauge needle moves from `89.2%` to `103.0% (Over-exploited)`.
- **Narration:** "Look at Farmer C: self-reported claim is 20 hours, but electrical meter records 50 hours. AquaPulse flags Farmer C as `REVIEW`. Crucially: verification flags, it never cuts. Disputed water is held in escrow, never removed."
- **Action (0:45):** Scroll to Allocation & Verification Table.
  - Highlight Farmer C row: $R=20$, $E=50$, $T=0.400$, $\lambda_C=0.600$, $U=38.0$, Flag `REVIEW`.
- **Action (0:55):** Point to "Zero Diff" verification badge.
  - Recomputed in the browser via TypeScript core math — zero floating-point divergence against the Python reference oracle.

---

### [1:05 - 1:40] Beat 4 — "Allocate: Max-Min Water-Filling & Escrow"
- **Action (1:05):** Press keyboard key `4` (or click "Beat 4").
  - View Allocation Waterfall with the `5.0 m³` Dignity Floor line.
- **Narration:** "When water is scarce, land share decides — verification does not move water between farmers. At Pool 104 m³, land share governs. Slide pool to 130 m³:"
- **Action (1:20):** Click Drill Preset **"Incorrect Data Drill"** or view C's escrow split.
  - Highlight Farmer C escrow band: **20.0 m³ released**, **14.1 m³ held in escrow**.
- **Action (1:32):** Open Committee Hearing modal or inspect Escrow Ledger.
  - Explain: "Only a human committee `CONFIRMED` decision can resolve held escrow."

---

### [1:40 - 2:05] W4 — "We Tested Our Own System"
- **Action (1:40):** Scroll to **W4 Cap Provenance & Multi-Season Trajectories**.
- **Narration:** "We red-teamed our own mathematics over 156-week closed-loop simulations under shifting recharge and adversarial reader collusion."
- **Action (1:48):** Click toggle **"🌧️ Shift the model"**.
  - Show simulated recharge drought.
- **Action (1:54):** Click toggle **"🚨 60 % of readers lie"**.
  - Point to the Two-Arm Measured Comparison card:
    - Arm 1 (Reports-Only): runaway miscoverage, safe floor violations.
    - Arm 2 (Verified + Overdraw EMA): miscoverage controlled at target 10%, safe floor strictly guarded.

---

### [2:05 - 2:30] W9 & W11 — "Merkle Receipts & Institutional Grounding"
- **Action (2:05):** Scroll to **W9 Merkle Inspector**.
  - Merkle root is valid green: `64-hex SHA-256`.
- **Action (2:10):** Click **"Tamper (+10 m³ to C)"** button.
  - Root flashes red: `TAMPERED`. Cryptographic mismatch with exact byte difference identified.
- **Action (2:16):** Click **"Restore Valid Ledger"** (`VALID` returns).
- **Action (2:20):** Click **"⚖️ Honesty Panel"** in header.
  - Point to active DOM counts (0 unlabelled values).
  - Point to **Institutional Alignment (§12)**:
    - MAHA Water Mission (ANRF + MoJS, ₹200 crore / 5 yrs) via BHARAT-WIN portal (PIB PRID 2267551).
    - Atal Bhujal Yojana gram-panchayat water budgets continuing to 2027 (PIB PRID 2291800).
- **Narration (2:28):** "AquaPulse is a provable instrument for transparent aquifer governance. Thank you."
