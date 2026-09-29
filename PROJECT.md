# Project: AquaPulse v8 Guaranteed Groundwater Ledger

## Architecture
AquaPulse v8 is a distributed, cloud-first guaranteed groundwater ledger combining physical aquifer modeling, adaptive conformal safe-yield guarantees (ACSY), Bayesian trust verification, game-theoretic Karma allocation with a non-negotiable dignity floor, cryptographic Merkle receipts, and an anti-hallucinating bilingual AI copilot on a 100% free-tier online infrastructure stack.

```
                          ┌───────────────────────────┐
                          │     React PWA (Vercel)    │
                          │   (Hindi/English, QR,     │
                          │   Zone-A Live, Honesty)   │
                          └─────────────┬─────────────┘
                                        │ HTTPS / REST
                                        ▼
                          ┌───────────────────────────┐
                          │   Spring Cloud Gateway    │
                          │   (JWT, Upstash Rate Lim) │
                          └──────┬─────────────┬──────┘
             ┌───────────────────┼─────────────┴───────────────────┐
             ▼                   ▼                                 ▼
   ┌──────────────────┐ ┌──────────────────┐             ┌──────────────────┐
   │  verify-service  │ │guarantee-service │             │ copilot-service  │
   │ (Bayesian Trust, │ │ (Theis, Lentz E1,│             │ (Spring AI 1.1,  │
   │  Zone-A Worked)  │ │ ACSY log kappa,  │             │ ModelRouter, RAG,│
   └─────────┬────────┘ │ ESS >= 150 Temp) │             │ Grounding Regex) │
             │          └────────┬─────────┘             └─────────┬────────┘
             ▼                   ▼                                 │ (read-only)
   ┌──────────────────┐          │                                 ▼
   │allocation-service│◄─────────┘                       ┌──────────────────┐
   │(Pool Allocation, │                                  │ Neon Postgres +  │
   │ Karma Pool a=0.35│                                  │     pgvector     │
   │ Merkle Receipts) │─────────────────────────────────►│ (10-table schema,│
   └──────────────────┘                                  │Flyway migrations)│
                                                         └──────────────────┘
```

### Primary Cloud Infrastructure Stack
1. **Neon Serverless PostgreSQL (with pgvector)**: Managed relational and vector persistence via `NEON_URL`.
2. **Upstash Cloud Redis**: Serverless Redis via `REDIS_URL` (`rediss://`) for distributed rate limiting and token caching.
3. **Cloud LLM APIs**: Spring AI 1.1 ModelRouter targeting Groq (Llama 3.3 70B), Cerebras, Google AI Studio Gemini Flash, and OpenRouter free models.
4. **Cloud Deployment Manifests**: Render (`render.yaml`), Cloud Run (`cloudrun-service.yaml`), and Vercel (`vercel.json`) with HTTPS endpoints.
5. **Real-time Online Data Feeds**: National Water Data Portal (NWDP / India-WRIS) and Open-Meteo Weather API.
6. **Local Fallback**: Docker Compose (`docker-compose.yml`) with Kafka KRaft, Redis alpine, and PostgreSQL pgvector for offline dev/CI testing.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | PostgreSQL Schema DDL | 10-table relational schema (`zones`, `farmers`, `readings`, `village_kappa`, `seasons`, `allocations`, `ledger_roots`, `audit_queue`, `rule_proposals`, `doc_chunks`) | M1 | Survey |
| F2 | Flyway Migration V1 | Baseline table creation, foreign keys, constraints, and defaults | M1 | Survey |
| F3 | Flyway Migration V2 | Performance indexes, composite lookup indexes, and HNSW vector index | M1 | Survey |
| F4 | Flyway Migration V3 | Seed data for Zone-A worked example (4 farmers, zone metadata, initial kappa) | M1 | Survey |
| F5 | pgvector HNSW Index | Cosine similarity vector search index for GEC-2015 chunks ($m=16, ef=64$) | M1 | Survey |
| F6 | Neon Auto-Suspend Resiliency | HikariCP connection pool with 30s timeout and validation query for serverless compute pause/resume | M1 | Survey |
| F7 | Upstash Cloud Redis Config | TLS connection to `rediss://` for distributed rate limiting and caching | M1 | Survey |
| F8 | Cloud Deployment Manifests | Render `render.yaml`, Cloud Run `cloudrun-service.yaml`, and Vercel `vercel.json` | M1 | Survey |
| F9 | Local Docker Compose | KRaft Kafka, Redis alpine, and PostgreSQL pgvector container orchestration | M1 | Survey |
| F10 | Online Data Feeds | NWDP / India-WRIS piezometer telemetry and Open-Meteo precipitation/temperature sync | M1 | Survey |
| F11 | Maven Multi-Module Scaffolding | Java 21, Spring Boot 3.3.4, Spring Cloud 2023.0.3, Spring AI 1.0.0-M1 multi-module structure | M1 | Survey |
| F12 | Traceability Metadata DTOs | Enforced `(m*, confidence, kappa_v, data_coverage, model_hash)` on all allocation payloads | M1 | Survey |
| F13 | Farmer Trust Formula | $T = 1 - \|R - E\| / \max(R, E)$ with edge case $T=1.0$ when $R=E=0$ | M2 | Survey |
| F14 | Verified Hours Formula | $U = T \cdot R + (1 - T) \cdot E$ trust-weighted interpolation | M2 | Survey |
| F15 | Bayesian Reliability Model | Conjugate $\text{Beta}(\alpha, \beta)$ tracking per reporter | M2 | Survey |
| F16 | Audit Escalation Queue | Z-score trigger ($z > 2.0$) or low mean reliability ($\mathbb{E}[\theta] < 0.60$) flagging to audit_queue | M2 | Survey |
| F17 | CGWB Stress Classification | Safe ($\le 70\%$, 1.00), Semi-Critical ($70-90\%$, 0.90), Critical ($90-100\%$, 0.80), Over-exploited ($>100\%$, 0.65) | M2 | Survey |
| F18 | Land-Proportional Allocation | Weekly pool distributed strictly proportionally to registered farmer acreage | M2 | Survey |
| F19 | Zone-A Benchmark Test | Exact reproduction: Rep 116.0h, Elec 144.0h, Ver 124.8h, Stress 96.0% Critical, Pool 104.0h, Farmer C 26.0h (-31.6%) | M2 | Survey |
| F20 | Theis Well Drawdown Superposition | Multi-well analytical drawdown with weekly rate increment steps $\Delta Q_k$ | M3 | Survey |
| F21 | Peaceman Self-Radius Correction | Grid block cell drawdown correction $r_0 = 0.14 \sqrt{\Delta x^2 + \Delta y^2}$ and wellbore fallback | M3 | Survey |
| F22 | Lentz $E_1(x)$ Exponential Integral | Power series ($x \le 1.0$) and Lentz continued fraction ($x > 1.0$) matching test vectors $< 10^{-14}$ | M3 | Survey |
| F23 | Student-$t$ Robust Likelihood | $\nu = 4.0$ robust heavy-tailed likelihood for aquifer parameter reweighting | M3 | Survey |
| F24 | Bisection Tempering ESS $\ge 150$ | Tempering parameter $\lambda \in [0, 1]$ solved in 40 bisection iterations to enforce $\text{ESS} \ge 150.0$ | M3 | Survey |
| F25 | ACSY Log $\kappa_v$ Update Loop | $\log \kappa_v \leftarrow \text{clamp}(\log \kappa_v + 0.3(\text{err} - 0.10), -1.5, 3.0)$ | M3 | Survey |
| F26 | Regional Warm-Start $\kappa_v$ | Initialization from GEC hydrogeological unit baselines | M3 | Survey |
| F27 | Safe-Yield Cap Multiplier $m^*$ | $m^* = \min(1.0, D_{\text{crit}} / (\exp(\kappa_{\log}) \cdot Q_{w, 0.90}))$ | M3 | Survey |
| F28 | Dynamic Karma Common-Pool | $\alpha = 0.35$ common-pool bidding mechanism redistributing winning bids to all participants | M4 | Survey |
| F29 | HARD INVARIANT 1: Dignity Floor | `DIGNITY_FLOOR_M3 = 5.0` immutable `static final` code constant | M4 | Survey |
| F30 | SHA-256 Merkle Receipt Generator | Binary Merkle tree with leaf prefix `0x00`, node prefix `0x01`, and odd leaf promotion | M4 | Survey |
| F31 | Merkle Proof Verification Suite | Cryptographic inclusion proofs: 200/200 honest pass, 200/200 tampered fail | M4 | Survey |
| F32 | Spring AI 1.1 ModelRouter | Circuit-breaker cascading across Groq, Cerebras, Gemini Flash, and OpenRouter | M5 | Survey |
| F33 | BeanOutputConverter Structured JSON | Enforced schema validation on LLM output | M5 | Survey |
| F34 | NumericGroundingValidator | Regex `-?\d+(\.\d+)?%?` validation within $\pm 0.05$ of input DTO values | M5 | Survey |
| F35 | Deterministic Fallback Template | Rigid string fallback template triggered on any ungrounded numeric token | M5 | Survey |
| F36 | Read-Only Spring AI MCP Tools | Zone status and allocation inspection tools with zero mutation capabilities | M5 | Survey |
| F37 | Committee RAG Assistant | Cosine similarity retrieval over GEC-2015 documentation chunks | M5 | Survey |
| F38 | 5/5 Red-Team Adversarial Suite | Validation of 5 adversarial scenarios (instruction override, ungrounded number, out-of-context RAG, unapproved rule, dignity floor deletion) | M5 | Survey |
| F39 | HARD INVARIANT 3: Read-Only Copilot | Bean graph inspection test asserting copilot beans hold zero write-capable repositories | M5 | Survey |
| F40 | Spring Cloud Gateway | JWT authentication, Upstash Redis token-bucket rate limiting, unified REST routing | M6 | Survey |
| F41 | Bilingual React PWA | Offline-first responsive PWA supporting Hindi and English with Devanagari digit normalization | M6 | Survey |
| F42 | QR-Code Merkle Receipt Validation | Web Crypto API client-side SHA-256 Merkle proof verification | M6 | Survey |
| F43 | Zone-A Live Simulation Visualizer | Interactive dashboard reproducing exact Zone-A figures | M6 | Survey |
| F44 | Public Honesty Panel | Real vs. synthetic signal provenance, ESS $\ge 150$, ACSY $\kappa_v$ calibration gates | M6 | Survey |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Data Layer & Cloud Persistence | PostgreSQL Flyway migrations (V1-V3), pgvector HNSW, Upstash Redis, Cloud manifests, Maven multi-module scaffolding | none | IN_PROGRESS |
| M2 | Verification & Allocation Engine | `verify-service`, `allocation-service`, trust calculation, Bayesian reliability, CGWB tiers, Zone-A benchmark | M1 | PLANNED |
| M3 | Physics Guarantee & Safe-Yield Engine | `guarantee-service`, Theis superposition, Peaceman self-radius, Lentz E1, ESS>=150 tempering, ACSY log kappa updates | M1 | PLANNED |
| M4 | Karma Allocation & Merkle Receipts | Dynamic Karma common-pool ($\alpha=0.35$), `DIGNITY_FLOOR_M3 = 5.0` constant, SHA-256 Merkle tree & proof suite | M1, M2 | PLANNED |
| M5 | AI Copilot & Guardrails | `copilot-service`, Spring AI 1.1 ModelRouter (Groq/Cerebras/Gemini/OpenRouter), NumericGroundingValidator, RAG, 5/5 red-team | M1, M2, M3 | PLANNED |
| M6 | API Gateway & Bilingual React PWA | Spring Cloud Gateway, JWT, Upstash rate limiting, React PWA (Hindi/English), QR validation, Zone-A simulation, Honesty Panel | M1, M2, M3, M4, M5 | PLANNED |
| M7 | Final Milestone: E2E Test Suite & Hardening | Phase 1: 100% E2E test suite pass (Tiers 1-4); Phase 2: Adversarial Coverage Hardening (Tier 5) | M1-M6, TEST_READY | PLANNED |

---

## Interface Contracts

### 1. `verify-service` ↔ `allocation-service`
- Input: Ingested reading event (`farmer_id`, `reported_hours`, `electricity_implied_hours`, `t_event`, `prov`, `sig`)
- Calculation: $T = 1 - |R - E| / \max(R, E)$, $U = T \cdot R + (1 - T) \cdot E$
- Output DTO / Kafka Event (`verifications-completed`):
  ```json
  {
    "farmer_id": "Farmer C",
    "zone_id": "Zone-A",
    "reported_hours": 22.0,
    "electricity_implied_hours": 48.0,
    "trust": 0.458333,
    "verified_hours": 38.0,
    "z_score": 2.45,
    "audit_flagged": true
  }
  ```

### 2. `guarantee-service` ↔ `allocation-service`
- Input: Zone ID, weekly verified pumping hours, calibration reading from piezometer
- Calculation: Theis superposition, Peaceman radius, $E_1(x)$ Lentz, ESS $\ge 150$ tempering, ACSY update
- Output DTO / Kafka Event (`drawdown-updates`):
  ```json
  {
    "zone_id": "Zone-A",
    "m_star": 0.80,
    "confidence": 82.0,
    "kappa_v": 1.0,
    "data_coverage": 1.0,
    "model_hash": "theis-lentz-acsy-v8"
  }
  ```

### 3. `allocation-service` ↔ Public Ledger & API Gateway
- Input: Verified farmer hours, zone stress factor, safe-yield cap multiplier $m^*$
- Calculation: Land-proportional or Karma round, Merkle tree construction
- Traceability Invariant: Must include `(m*, confidence, kappa_v, data_coverage, model_hash)`
- Output DTO:
  ```json
  {
    "zone_id": "Zone-A",
    "stress_score": 96.0,
    "category": "Critical",
    "weekly_pool": 104.0,
    "cap_multiplier": 0.80,
    "confidence": 82.0,
    "kappa_v": 1.0,
    "data_coverage": 1.0,
    "model_hash": "theis-lentz-acsy-v8",
    "allocations": [
      {"farmer_id": "Farmer A", "acres": 5.0, "hours": 26.0, "cert_hash": "0x..."},
      {"farmer_id": "Farmer B", "acres": 5.0, "hours": 26.0, "cert_hash": "0x..."},
      {"farmer_id": "Farmer C", "acres": 5.0, "hours": 26.0, "cert_hash": "0x..."},
      {"farmer_id": "Farmer D", "acres": 5.0, "hours": 26.0, "cert_hash": "0x..."}
    ]
  }
  ```

### 4. `copilot-service` ↔ Frontends
- Invariant: Zero write-capable repositories.
- Grounding: Extracted regex `-?\d+(\.\d+)?%?` must match input DTO numbers within $\pm 0.05$.
- Fallback: `"Zone {{zone_id}} is {{category}} at {{stress_score}}% of its safe weekly budget ({{confidence}}% confidence). This week's pool is {{pool_hours}} hours."`

---

## Code Layout
```
aquapulse/
├── pom.xml                                    # Parent POM (Java 21, Spring Boot 3.3.4)
├── docker-compose.yml                         # Local Kafka KRaft + Redis fallback
├── render.yaml                                # Cloud Render deployment manifest
├── cloudrun-service.yaml                      # Cloud Run deployment manifest
├── vercel.json                                # Cloud Vercel deployment manifest
├── stress/
│   └── aquapulse_stress.py                    # Reference mathematical harness
├── aquapulse-common/                          # Shared library (Constants, Merkle, DTOs)
│   └── src/main/java/com/aquapulse/common/
│       ├── constants/AquaPulseConstants.java  # DIGNITY_FLOOR_M3 = 5.0
│       ├── merkle/MerkleTree.java             # SHA-256 Merkle receipt generator & verifier
│       └── dto/                               # Cross-service event & response records
├── verify-service/                            # R2 Verification Engine (8081)
│   └── src/main/java/com/aquapulse/verify/
│       ├── service/TrustService.java          # T = 1 - |R-E|/max(R,E), U = T*R + (1-T)*E
│       └── service/BayesianReliability.java   # Beta(alpha, beta) & Z-score audit trigger
├── allocation-service/                        # R2, R5 Allocation Engine (8082)
│   └── src/main/java/com/aquapulse/allocation/
│       ├── service/PoolAllocationService.java # Land-proportional & CGWB tiers
│       └── service/KarmaAllocationService.java# Dynamic common-pool alpha=0.35 + Dignity Floor
├── guarantee-service/                         # R3 Physics Guarantee & ACSY (8083)
│   └── src/main/java/com/aquapulse/guarantee/
│       ├── physics/TheisSuperposition.java    # Analytical drawdown superposition & Peaceman
│       ├── math/ExponentialIntegralE1.java   # Lentz continued fraction & Taylor power series
│       ├── bayes/PosteriorTempering.java      # Student-t likelihood & bisection ESS >= 150
│       └── acsy/ConformalSafeYield.java       # log kappa_v update loop & m* cap multiplier
├── copilot-service/                           # R4 AI Copilot & Guardrails (8084)
│   └── src/main/java/com/aquapulse/copilot/
│       ├── router/ModelRouter.java            # Cloud LLM cascade (Groq/Cerebras/Gemini/OpenRouter)
│       ├── guardrails/NumericGroundingValidator.java # Regex token validation +/- 0.05
│       ├── rag/CommitteeRagService.java       # GEC-2015 pgvector RAG
│       └── mcp/ReadOnlyMcpTools.java          # Read-only Spring AI MCP tools
├── api-gateway/                               # R6 Spring Cloud Gateway (8080)
│   └── src/main/java/com/aquapulse/gateway/
│       ├── config/GatewayRoutesConfig.java    # Route definitions & JWT filter
│       └── filter/UpstashRateLimiter.java     # Redis token-bucket rate limiter
├── aquapulse-pwa/                             # R6 Offline-First Bilingual React PWA
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── components/ZoneASimulation.tsx     # Interactive Zone-A benchmark visualizer
│       ├── components/HonestyPanel.tsx        # Real vs synthetic signals & empirical gates
│       ├── components/QrReceiptValidator.tsx  # Web Crypto Merkle proof verification
│       └── i18n/                              # Hindi & English translations
└── e2e-tests/                                 # E2E Test Suite (Tiers 1-5)
    ├── src/test/java/com/aquapulse/e2e/
    │   ├── tier1/FeatureCoverageTest.java     # >= 5 tests per feature
    │   ├── tier2/BoundaryCornerTest.java      # >= 5 tests per feature
    │   ├── tier3/CrossFeatureTest.java        # Pairwise combinations
    │   ├── tier4/RealWorldScenariosTest.java  # Full pipeline Zone-A benchmark
    │   └── tier5/AdversarialHardeningTest.java# White-box stress tests
```
