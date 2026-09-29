# AquaPulse v8 — E2E Test Infrastructure Specification

**Document Version**: 1.0.0  
**Author**: teamwork_preview_test_writer_e2e_1  
**Target Milestone**: M7 (E2E Test Suite & Test Infrastructure)  
**Specification Reference**: `AquaPulse_v8_FAANG_FINAL.md` & `PROJECT.md`  
**Execution Environment**: Strictly Online Cloud Architecture (with High-Fidelity Local Simulation Harness)

---

## 1. Test Philosophy

AquaPulse v8 governs common-pool groundwater extraction through physical aquifer simulations, conformal coverage guarantees, Bayesian trust weighting, game-theoretic Karma auctions, and bilingual AI advisory. Because real livelihoods depend on the dignity floor and volumetric caps, the testing methodology follows four non-negotiable principles:

1. **Independent & Opaque-Box**: Tests are designed strictly from public interfaces and requirement specifications (`ORIGINAL_REQUEST.md`, `PROJECT.md`, `AquaPulse_v8_FAANG_FINAL.md`). Tests exercise the system via API endpoints, DTO contracts, and cryptographic proofs without relying on private implementation details.
2. **Requirement-Driven & Mathematically Grounded**: Every test assertion originates from an authoritative reference source:
   - Analytical drawdown formulas ($E_1$ Lentz, Theis superposition, Peaceman self-radius).
   - Exact mathematical benchmarks (Zone-A worked example reproducing 116.0h rep, 144.0h elec, 124.8h ver, 96.0% Critical, 104.0h pool, 26.0h Farmer C alloc).
   - Cryptographic invariants (Merkle SHA-256 leaf `0x00`, node `0x01`, 200/200 honest pass, 200/200 tampered fail).
   - Immutable code invariants (`DIGNITY_FLOOR_M3 = 5.0` constant, read-only copilot bean graph).
3. **Zero Facade Tests**: Every test exercises real computation and validates state transitions. Facade tests that assert `true == true` or mock away all business logic are strictly forbidden.
4. **Dual-Target Portability (Cloud & Local Simulation)**: Every test is executable identically against:
   - A **Local Simulation Harness** for fast, deterministic, self-contained CI testing without external cloud credentials.
   - Live **Cloud Endpoints** (Spring Cloud Gateway on Render/Cloud Run, Neon PostgreSQL + pgvector, Upstash Redis, Groq/Gemini/Cerebras LLMs) via environment configuration.

---

## 2. Test Architecture

The testing framework is structured into decoupled layers allowing transparent switching between live cloud services and the in-process high-fidelity simulation harness:

```
                            ┌───────────────────────────────────┐
                            │        pytest / JUnit Runner      │
                            └─────────────────┬─────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │ Tier 1: Feature (F1-F44)│                     │ Tier 2: Boundary/Corner │
         ├─────────────────────────┤                     ├─────────────────────────┤
         │ Tier 3: Pairwise Inter. │                     │ Tier 4: Real-World Scen.│
         └────────────┬────────────┘                     └────────────┬────────────┘
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │       AquaPulseTestClient       │
                             │  (Unified Interface / Protocol) │
                             └────────────────┬────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
        [AQUAPULSE_TEST_TARGET=cloud]                     [AQUAPULSE_TEST_TARGET=sim]
        ┌───────────────────────────────┐                 ┌───────────────────────────────┐
        │       AquaPulseCloudClient    │                 │   AquaPulseSimulationHarness  │
        ├───────────────────────────────┤                 ├───────────────────────────────┤
        │ • REST over HTTP (httpx)      │                 │ • 10-table schema state       │
        │ • Gateway JWT Authentication  │                 │ • Theis + Lentz E1 math engine│
        │ • Upstash Redis Rate Limiting │                 │ • Bayesian Beta reliability   │
        │ • Neon pgvector Cloud DB      │                 │ • ACSY log kappa update loop  │
        │ • Spring AI Cloud ModelRouter │                 │ • Karma pool & Dignity Floor  │
        │ • Live Cloud HTTPS Endpoints  │                 │ • Merkle receipts & proofs    │
        │                               │                 │ • Grounding validator & RAG   │
        └───────────────────────────────┘                 └───────────────────────────────┘
```

### 2.1 Configuration & Target Selection
- Environment variable `AQUAPULSE_TEST_TARGET`:
  - `sim` (default): Runs tests against `AquaPulseSimulationHarness`, requiring zero external network calls or credentials.
  - `cloud`: Runs tests against live endpoints specified by `AQUAPULSE_ENDPOINT_URL` (e.g. `https://aquapulse-api.onrender.com` or `http://localhost:8080`).
- Environment variable `AQUAPULSE_JWT_TOKEN`: Optional JWT bearer token for authenticated cloud gateway endpoints.

---

## 3. 4-Tier Coverage Goals

The AquaPulse v8 test suite enforces a rigorous 4-tier hierarchy:

### Tier 1: Feature Coverage (>= 5 test cases per feature across F1–F44)
- **Target**: Minimum 5 dedicated test cases for each of the 44 features ($44 \times 5 = 220$ test cases minimum).
- **Scope**: Verifies the core functional contract and happy path of every feature from schema definition to PWA UI logic.

### Tier 2: Boundary & Corner Cases (>= 5 test cases per feature)
- **Target**: Minimum 5 edge/corner test cases per feature ($44 \times 5 = 220$ test cases minimum).
- **Scope**: Boundary values, empty collections, zero coordinates, extreme stress scores ($0\%$, $70\%$, $90\%$, $100\%$, $>100\%$), singular and non-power-of-2 Merkle trees, numeric grounding tolerance thresholds ($\pm 0.05$ vs $\pm 0.05001$), Redis connection drops, and JWT token expirations.

### Tier 3: Cross-Feature Interactions (Pairwise Combinations)
- **Target**: Minimum 30 integration test cases combining distinct subsystems.
- **Scope**:
  - Ingestion $\to$ Bayesian Trust $\to$ Audit Queue escalation (F13 $\leftrightarrow$ F15 $\leftrightarrow$ F16).
  - Verified Hours $\to$ CGWB Stress $\to$ Safe-Yield Cap Multiplier $m^*$ (F14 $\leftrightarrow$ F17 $\leftrightarrow$ F27).
  - Allocation Service $\to$ Karma Common-Pool $\to$ Merkle Receipt Generation (F18 $\leftrightarrow$ F28 $\leftrightarrow$ F30).
  - Merkle Tree $\to$ Inclusion Proof $\to$ Client-side QR Validator (F30 $\leftrightarrow$ F31 $\leftrightarrow$ F42).
  - Drawdown Forecast $\to$ ACSY Conformal Update $\to$ Village Kappa Tracking (F20 $\leftrightarrow$ F25 $\leftrightarrow$ F4).
  - Copilot DTO Ingestion $\to$ Numeric Grounding Validator $\to$ Template Fallback (F12 $\leftrightarrow$ F34 $\leftrightarrow$ F35).
  - Gateway JWT Authentication $\to$ Upstash Rate Limiter $\to$ Public API (F40 $\leftrightarrow$ F7 $\leftrightarrow$ R6).

### Tier 4: Real-World Application Scenarios
- **Target**: 5 comprehensive, end-to-end multi-step system workflows.
- **Scope**:
  1. **Zone-A Worked Example Benchmark**: Complete replication of 4 farmers, 20 acres, 130h budget, yielding exact $96.0\%$ Critical category, $104.0$h pool, and Farmer C allocation $26.0$h ($-31.6\%$ reduction).
  2. **Multi-Week Adversarial Reporter Attack**: Persistent liar reporting $10$h while electricity indicates $60$h, driving Bayesian reliability $\mathbb{E}[\theta] < 0.60$ and escalating to human audit queue.
  3. **Severe Drought & Aquifer Drawdown Stress**: Rapid depletion exceeding critical drawdown $D_{\text{crit}}$, triggering ACSY kappa expansion and aggressive $m^*$ curtailment while preserving the $5.0\,\text{m}^3$ dignity floor.
  4. **Dynamic Karma Common-Pool Auction Round**: High-demand drought round with $10$ farmers, urgent bidding with $\alpha = 0.35$, pool redistribution, and mathematical proof of zero dignity floor breaches.
  5. **Full 5/5 Red-Team Adversarial AI Evaluation**: Execution of 5 red-team prompts (instruction override, ungrounded number injection, out-of-context RAG query, unapproved rule proposal, dignity floor deletion attack).

---

## 4. Feature Inventory Test Mapping

The following matrix maps all 44 features to their corresponding Tier 1 and Tier 2 test suites:

| Feature ID | Feature Name | Tier 1 Test Suite | Tier 2 Test Suite | Core Acceptance Assertion |
| :--- | :--- | :--- | :--- | :--- |
| **F1** | PostgreSQL Schema DDL | `test_f01_f05_data_layer.py` | `test_tier2_data_infra_boundaries.py` | 10 tables exist with primary/foreign keys and column constraints |
| **F2** | Flyway Migration V1 | `test_f01_f05_data_layer.py` | `test_tier2_data_infra_boundaries.py` | V1 script applies baseline schema cleanly without syntax errors |
| **F3** | Flyway Migration V2 | `test_f01_f05_data_layer.py` | `test_tier2_data_infra_boundaries.py` | Composite & lookup indexes created for high-throughput queries |
| **F4** | Flyway Migration V3 | `test_f01_f05_data_layer.py` | `test_tier2_data_infra_boundaries.py` | Seed data for Zone-A (4 farmers, initial kappa 1.0) present |
| **F5** | pgvector HNSW Index | `test_f01_f05_data_layer.py` | `test_tier2_data_infra_boundaries.py` | Cosine distance index created with $m=16, ef=64$ on 768-dim vectors |
| **F6** | Neon Auto-Suspend Resiliency | `test_f06_f10_infra_feeds.py` | `test_tier2_data_infra_boundaries.py` | HikariCP reconnects smoothly after simulated 30s compute pause |
| **F7** | Upstash Cloud Redis Config | `test_f06_f10_infra_feeds.py` | `test_tier2_data_infra_boundaries.py` | TLS `rediss://` client configuration, ping, and rate limit tracking |
| **F8** | Cloud Deployment Manifests | `test_f06_f10_infra_feeds.py` | `test_tier2_data_infra_boundaries.py` | Render, Cloud Run, and Vercel configs contain HTTPS & free-tier envs |
| **F9** | Local Docker Compose | `test_f06_f10_infra_feeds.py` | `test_tier2_data_infra_boundaries.py` | Docker compose orchestrates Kafka KRaft, Redis alpine, pgvector |
| **F10** | Online Data Feeds | `test_f06_f10_infra_feeds.py` | `test_tier2_data_infra_boundaries.py` | Ingests NWDP piezometer telemetry & Open-Meteo weather readings |
| **F11** | Maven Multi-Module Scaffolding | `test_f11_f12_scaffolding_dto.py` | `test_tier2_data_infra_boundaries.py` | Parent POM defines 6 microservices with Java 21 & Spring Boot 3.3.4 |
| **F12** | Traceability Metadata DTOs | `test_f11_f12_scaffolding_dto.py` | `test_tier2_data_infra_boundaries.py` | Every allocation payload contains `(m*, confidence, kappa_v, coverage, model_hash)` |
| **F13** | Farmer Trust Formula | `test_f13_f19_verification_alloc.py` | `test_tier2_verification_boundaries.py` | $T = 1 - \|R - E\| / \max(R, E)$; $T=1.0$ when $R=E=0$ |
| **F14** | Verified Hours Formula | `test_f13_f19_verification_alloc.py` | `test_tier2_verification_boundaries.py` | $U = T \cdot R + (1 - T) \cdot E$ trust-weighted interpolation |
| **F15** | Bayesian Reliability Model | `test_f13_f19_verification_alloc.py` | `test_tier2_verification_boundaries.py` | Beta($\alpha, \beta$) conjugate update shifts mean $\mathbb{E}[\theta]$ accurately |
| **F16** | Audit Escalation Queue | `test_f13_f19_verification_alloc.py` | `test_tier2_verification_boundaries.py` | Flags when $z > 2.0$ or $\mathbb{E}[\theta] < 0.60$ into `audit_queue` |
| **F17** | CGWB Stress Classification | `test_f13_f19_verification_alloc.py` | `test_tier2_verification_boundaries.py` | Safe ($\le 70\%$, 1.0), Semi-Crit ($70-90\%$, 0.9), Crit ($90-100\%$, 0.8), Over ($>100\%$, 0.65) |
| **F18** | Land-Proportional Allocation | `test_f13_f19_verification_alloc.py` | `test_tier2_verification_boundaries.py` | Allocates pool strictly in proportion to registered acreage |
| **F19** | Zone-A Benchmark Test | `test_f13_f19_verification_alloc.py` | `test_tier2_verification_boundaries.py` | Exact match: Rep 116h, Elec 144h, Ver 124.8h, Stress 96%, Pool 104h, Farmer C 26h |
| **F20** | Theis Drawdown Superposition | `test_f20_f27_physics_guarantee.py` | `test_tier2_physics_boundaries.py` | Multi-well superposition with weekly increments $\Delta Q_k$ |
| **F21** | Peaceman Self-Radius | `test_f20_f27_physics_guarantee.py` | `test_tier2_physics_boundaries.py` | Corrects wellblock drawdown via $r_0 = 0.14 \sqrt{\Delta x^2 + \Delta y^2}$ |
| **F22** | Lentz $E_1(x)$ Exponential Integral| `test_f20_f27_physics_guarantee.py` | `test_tier2_physics_boundaries.py` | Relative error $< 10^{-14}$ across 7 test vectors ($x \in [0.01, 10.0]$) |
| **F23** | Student-$t$ Robust Likelihood | `test_f20_f27_physics_guarantee.py` | `test_tier2_physics_boundaries.py` | Heavy-tailed $\nu = 4.0$ prevents outlier collapse |
| **F24** | Bisection Tempering ESS $\ge 150$| `test_f20_f27_physics_guarantee.py` | `test_tier2_physics_boundaries.py` | 40-iteration bisection guarantees $\text{ESS} \ge 150.0$ under noisy data |
| **F25** | ACSY Log $\kappa_v$ Update Loop | `test_f20_f27_physics_guarantee.py` | `test_tier2_physics_boundaries.py` | $\log \kappa_v \leftarrow \text{clamp}(\log \kappa_v + 0.3(\text{err} - 0.10), -1.5, 3.0)$ |
| **F26** | Regional Warm-Start $\kappa_v$ | `test_f20_f27_physics_guarantee.py` | `test_tier2_physics_boundaries.py` | Baseline initialization from hydrogeological unit maps |
| **F27** | Safe-Yield Cap Multiplier $m^*$ | `test_f20_f27_physics_guarantee.py` | `test_tier2_physics_boundaries.py` | $m^* = \min(1.0, D_{\text{crit}} / (\exp(\kappa_{\log}) \cdot Q_{w, 0.90}))$ |
| **F28** | Dynamic Karma Common-Pool | `test_f28_f31_karma_merkle.py` | `test_tier2_karma_merkle_boundaries.py` | $\alpha = 0.35$ auction redistributes winning bids equally to all participants |
| **F29** | HARD INVARIANT 1: Dignity Floor | `test_f28_f31_karma_merkle.py` | `test_tier2_karma_merkle_boundaries.py` | `DIGNITY_FLOOR_M3 = 5.0` code constant cannot be bypassed or overridden |
| **F30** | SHA-256 Merkle Generator | `test_f28_f31_karma_merkle.py` | `test_tier2_karma_merkle_boundaries.py` | Leaf `0x00`, node `0x01`, odd leaf promotion, root generation |
| **F31** | Merkle Proof Verification Suite| `test_f28_f31_karma_merkle.py` | `test_tier2_karma_merkle_boundaries.py` | 200/200 honest proofs verify; 200/200 tampered proofs fail |
| **F32** | Spring AI 1.1 ModelRouter | `test_f32_f39_copilot_guardrails.py` | `test_tier2_copilot_boundaries.py` | Circuit-breaker cascading across Groq $\to$ Cerebras $\to$ Gemini $\to$ OpenRouter |
| **F33** | BeanOutputConverter Structured JSON | `test_f32_f39_copilot_guardrails.py` | `test_tier2_copilot_boundaries.py` | Validates strict JSON schema structure on LLM completion |
| **F34** | NumericGroundingValidator | `test_f32_f39_copilot_guardrails.py` | `test_tier2_copilot_boundaries.py` | Regex `-?\d+(\.\d+)?%?` numbers verified against DTO within $\pm 0.05$ |
| **F35** | Deterministic Fallback Template | `test_f32_f39_copilot_guardrails.py` | `test_tier2_copilot_boundaries.py` | Triggered immediately on any ungrounded numeric token |
| **F36** | Read-Only Spring AI MCP Tools | `test_f32_f39_copilot_guardrails.py` | `test_tier2_copilot_boundaries.py` | Exposes read tools; rejects any write, delete, or modify actions |
| **F37** | Committee RAG Assistant | `test_f32_f39_copilot_guardrails.py` | `test_tier2_copilot_boundaries.py` | Cosine similarity retrieval over GEC-2015 chunks; refuses irrelevant prompts |
| **F38** | 5/5 Red-Team Adversarial Suite | `test_f32_f39_copilot_guardrails.py` | `test_tier2_copilot_boundaries.py` | Blocks override, ungrounded number, RAG escape, unapproved rule, floor delete |
| **F39** | HARD INVARIANT 3: Read-Only Copilot| `test_f32_f39_copilot_guardrails.py` | `test_tier2_copilot_boundaries.py` | Bean inspection asserts zero write-capable repositories in copilot context |
| **F40** | Spring Cloud Gateway | `test_f40_f44_gateway_pwa.py` | `test_tier2_gateway_pwa_boundaries.py` | JWT authentication & Upstash Redis token-bucket rate limiting (HTTP 429) |
| **F41** | Bilingual React PWA | `test_f40_f44_gateway_pwa.py` | `test_tier2_gateway_pwa_boundaries.py` | Hindi & English translation dictionary & Devanagari digit normalization (०-९) |
| **F42** | QR-Code Merkle Validation | `test_f40_f44_gateway_pwa.py` | `test_tier2_gateway_pwa_boundaries.py` | Client-side Web Crypto SHA-256 inclusion proof recomputation |
| **F43** | Zone-A Live Simulation Visualizer | `test_f40_f44_gateway_pwa.py` | `test_tier2_gateway_pwa_boundaries.py` | Interactive calculation reproducing 116h/144h/124.8h/96%/104h/26h figures |
| **F44** | Public Honesty Panel | `test_f40_f44_gateway_pwa.py` | `test_tier2_gateway_pwa_boundaries.py` | Displays signal provenance (LIVE vs SYNTH), ESS $\ge 150$, ACSY $\kappa_v$ gates |

---

## 5. Test Suite Directory Layout

```
e2e-tests/
├── harness/
│   ├── __init__.py
│   ├── simulation_harness.py          # High-fidelity in-memory AquaPulse simulation engine
│   ├── cloud_client.py                # REST HTTP client targeting live Cloud Gateway
│   └── test_client.py                 # Abstract client switching between cloud and sim
├── tier1/
│   ├── __init__.py
│   ├── test_f01_f05_data_layer.py     # Schema DDL, Flyway V1-V3, pgvector HNSW (25 tests)
│   ├── test_f06_f10_infra_feeds.py    # Neon suspend, Upstash TLS, Manifests, Feeds (25 tests)
│   ├── test_f11_f12_scaffolding_dto.py# Maven multi-module, Traceability DTOs (10 tests)
│   ├── test_f13_f19_verification_alloc.py # Trust, Verified, Beta, Audit, CGWB, Zone-A (35 tests)
│   ├── test_f20_f27_physics_guarantee.py  # Theis, Peaceman, E1, Student-t, ESS, ACSY (40 tests)
│   ├── test_f28_f31_karma_merkle.py   # Karma common-pool, Dignity Floor, Merkle 200/200 (20 tests)
│   ├── test_f32_f39_copilot_guardrails.py # ModelRouter, Grounding, MCP, RAG, Red-Team (40 tests)
│   └── test_f40_f44_gateway_pwa.py    # Gateway JWT, Upstash, Hindi/Eng, QR, Honesty (25 tests)
├── tier2/
│   ├── __init__.py
│   ├── test_tier2_data_infra_boundaries.py # F1-F12 edge and boundary cases (60 tests)
│   ├── test_tier2_verification_boundaries.py # F13-F19 edge and boundary cases (35 tests)
│   ├── test_tier2_physics_boundaries.py    # F20-F27 edge and boundary cases (40 tests)
│   ├── test_tier2_karma_merkle_boundaries.py # F28-F31 edge and boundary cases (20 tests)
│   ├── test_tier2_copilot_boundaries.py    # F32-F39 edge and boundary cases (40 tests)
│   └── test_tier2_gateway_pwa_boundaries.py# F40-F44 edge and boundary cases (25 tests)
├── tier3/
│   ├── __init__.py
│   └── test_tier3_cross_feature.py    # Pairwise cross-feature interactions (30 tests)
├── tier4/
│   ├── __init__.py
│   └── test_tier4_real_world.py       # Full real-world scenarios (Zone-A, Liars, Stress, Karma, Red-Team) (10 tests)
├── src/test/java/com/aquapulse/e2e/   # Java test skeleton for PROJECT.md layout compliance
│   ├── tier1/FeatureCoverageTest.java
│   ├── tier2/BoundaryCornerTest.java
│   ├── tier3/CrossFeatureTest.java
│   ├── tier4/RealWorldScenariosTest.java
│   └── tier5/AdversarialHardeningTest.java
├── pom.xml                            # Java Maven module POM for e2e-tests
├── pytest.ini                         # Pytest configuration
└── run_e2e.py                         # Unified test runner with reporting
```

---

## 6. How to Run the Tests

### Local Simulation Mode (Default, Zero Config)
```powershell
python -m pytest e2e-tests/ -v
# Or via dedicated test runner:
python e2e-tests/run_e2e.py
```

### Live Cloud Endpoints Mode
```powershell
$env:AQUAPULSE_TEST_TARGET="cloud"
$env:AQUAPULSE_ENDPOINT_URL="https://aquapulse-api.onrender.com"
$env:AQUAPULSE_JWT_TOKEN="<jwt-token-here>"
python -m pytest e2e-tests/ -v
```

---

## 7. Quality Gates & Acceptance Verification

Every commit and build must satisfy:
1. **100% Pass Rate**: Zero test failures allowed across all tiers.
2. **Zone-A Worked Example Verification**: Exact numeric reproduction within $10^{-6}$ precision.
3. **Lentz $E_1(x)$ Vector Validation**: Absolute relative error $< 10^{-14}$ against SciPy test vectors.
4. **Merkle Proof Integrity**: Exactly 200/200 honest proofs pass, 200/200 corrupted proofs fail.
5. **Dignity Floor Invariant**: Zero farmers allocated less than $5.0\,\text{m}^3$ under any bidding outcome.
6. **Numeric Grounding Invariant**: Zero ungrounded numbers ($>\pm 0.05$ variance) pass to user.
