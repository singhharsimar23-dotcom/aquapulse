# AquaPulse — Guaranteed Water Accounting Ledger

> **"Verify, Then Allocate," Made Provable.**  
> Autonomous collective water governance with dual-signal verification, land-share proportional rationing, cryptographic Merkle receipts, and strict provenance enforcement.

---

## 1. What Is Real / Simulated / Assumed (§12)

Every number displayed in AquaPulse carries an explicit cryptographic provenance tag: `<Num value prov />` where `prov.kind` $\in$ `{LIVE, REPLAY, SYNTH, ASSUMPTION, USER}`.

| Component | Kind | Source & Grounding | Notes / Invariants |
|---|---|---|---|
| **Farmer Extraction Claims ($R$)** | `SYNTH` | Synthetic benchmark profile | Synthetic 4-farmer Zone-A vectors; never claimed as live telemetry. |
| **Well Pump Meter Hours ($E$)** | `SYNTH` | Synthetic DISCOM feeder meter model | The meter is a second opinion, not absolute proof. Missing is `null ≠ 0`. |
| **Sentinel-2 L2A NDVI Imagery** | `REPLAY` | AWS Earth Search STAC / Copernicus | Real dated satellite scene (`2026-10-04`) with SHA-256 hash. Weak corroboration ($\pm 50\%$ band); flags, never cuts. |
| **ET0 & Rainfall Telemetry** | `REPLAY` | Open-Meteo ERA5 / Forecast API | Real geographic coordinates (Wardha centroid $20.7453^\circ\text{N}, 78.6022^\circ\text{E}$). |
| **Aquifer Hydrogeology ($T, S$)** | `ASSUMPTION` | CGWB Aquifer Atlas / Theis model | Transmissivity $T=50\text{ m}^2/\text{d}$, Storativity $S=0.001$, editable in Honesty Panel. |
| **Engineering Parameters** | `ASSUMPTION` | Policy constants | $\lambda_{\max}=0.60$ (meter cap), Dignity Floor $=5.0\text{ m}^3/\text{wk}$, Review threshold $=0.50$. |
| **User Loaded Data (BYO CSV)** | `USER` | Client browser parsed CSV | Sanitized in-browser; zero server persistence. |

### Core Institutional & Scientific Truths (§12)
1. **Verification flags, never cuts:** Disputed water is held in segregated escrow, never auto-cut. Only an explicit human committee `CONFIRMED` decision adjusts an allocation.
2. **Water scarcity governance:** Verification does not move water between farmers when water is scarce — land share decides.
3. **No safety inflation:** We never claim verification increases physical water or improves safety; the conformal margin absorbs uncertainty, and verification buys attribution.
4. **Institutional Alignment:**
   - **MAHA Water Mission:** ANRF + Ministry of Jal Shakti (₹200 crore / 5 years, up to ₹20 crore per consortium) via BHARAT-WIN portal (`PIB PRID 2267551`).
   - **Atal Bhujal Yojana:** Live instrument for participatory gram-panchayat water security plans and budgets continuing to 2027 (`PIB PRID 2291800`).
   - **Boundary Invariant:** MoJS–ISRO MoU is unconfirmed (never claimed signed).

---

## 2. Quick Start: Fresh Clone Deployment

AquaPulse supports **Tier-0** (zero-backend, 100% offline in-browser deployment) and full cloud-native mode.

### Prerequisites
- Node.js $\ge 20$, npm
- Python $\ge 3.10$

### 1. Run Verification & Selftest
```bash
# Preflight network check & mathematical oracle parity
make preflight
make oracle
make check

# Run full test suite (Core Vitest, Frontend tests, S4 Pipeline, S13 Red-Team Table)
python scripts/verify.py S=S13
```

### 2. Start Frontend (Tier-0 / Offline Capable)
```bash
cd frontend
npm install
npm run build
npm run preview
# Open http://localhost:5173/?lite=1
```
The browser app automatically runs fully offline against `snapshot.json` and client-side TypeScript core mathematics.

### 3. Run Playwright E2E Suite (Tier-0 + Live)
```bash
cd frontend
npx playwright test
```

---

## 3. 2:30 Presentation Demo Script

For recorded presentations or live judging walkthroughs, follow the click-by-click script in [docs/DEMO_SCRIPT_2M30S.md](file:///C:/Users/hprad/OneDrive/Desktop/aquapulse/docs/DEMO_SCRIPT_2M30S.md):
- **0:00–0:25:** What They Said, What The Sky Saw (Sentinel-2 NDVI & Prove It Drawer)
- **0:25–1:05:** The Verify Moment (Farmer C Flagged `REVIEW`, Zero-Diff Browser Recompute)
- **1:05–1:40:** Allocate (Max-Min Water-Filling, Dignity Floor, Escrow Hold)
- **1:40–2:05:** We Tested Our Own System (Multi-Season Trajectories, 60% Liars, Two-Arm Contrast)
- **2:05–2:30:** Merkle Receipts & Institutional Alignment (Tamper Drill, Honesty Panel §12)

---

## 4. Key Artifacts & Invariants

| Path | Purpose |
|---|---|
| `packages/core/src/` | Cryptographic Merkle tree, Theis E1, and water-filling allocation in TypeScript |
| `reference/aquapulse_ref.py` | Reference mathematical oracle (arbitrates all numbers to $10^{-9}$) |
| `tests/test_s13_redteam.py` | Parametrised 34-case Red-Team test table (§13) |
| `frontend/e2e/demo_path.spec.ts` | Playwright E2E demo path suite (Tier-0 & enabled, 3 passes each) |
| `frontend/e2e/provenance.spec.ts` | DOM Provenance enforcement (zero unprovenanced digits allowed) |
| `docs/verified.json` | Verifiable SHA-256 hashes of all external packages, layers, and PIB releases |
| `docs/DEMO_SCRIPT_2M30S.md` | Exact 2:30 presentation click script |
