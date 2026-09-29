# AquaPulse v8 — Guaranteed Water Ledger

> **"Verify, Then Allocate," Made Provable**
> Free-tier, cloud-native, 100% online. No credit card required anywhere in the primary path.

---

## Architecture

```
 Farmer App (PWA)
      │
  Vercel CDN
      │
 API Gateway (:8080)  ←── Spring Cloud Gateway + Upstash Redis rate-limit
      │
  ┌───┴──────────────────────────────────────┐
  │verify-service (:8081)  allocation-service (:8082)  guarantee-service (:8083)  copilot-service (:8084)
  └─────────────────────────┬────────────────────────────────────────────────────────────────────────────┘
                            │
                    Neon Serverless Postgres (pgvector)
```

### Services
| Service | Port | Purpose |
|---|---|---|
| `api-gateway` | 8080 | Spring Cloud Gateway, CORS, rate-limiting |
| `verify-service` | 8081 | Trust formula T=1-\|R-E\|/max(R,E), Bayesian Beta tracker |
| `allocation-service` | 8082 | Land-proportional allocation, Merkle receipts, Karma |
| `guarantee-service` | 8083 | Theis E1, ACSY conformal safe-yield, posterior tempering |
| `copilot-service` | 8084 | Spring AI ModelRouter (Groq→Cerebras→Gemini→OpenRouter), NumericGroundingValidator |
| `frontend` | — | React 18 + Vite PWA, bilingual EN/HI, Zone-A dashboard |

---

## Quick Start

### 1. Prerequisites
- Java 21, Maven 3.9+
- Node 20+, npm
- Python 3.11+ (for tests only)

### 2. Cloud accounts (all free tier)
| Service | Signup |
|---|---|
| **Neon** — Serverless Postgres | https://neon.tech |
| **Upstash** — Cloud Redis | https://upstash.com |
| **Groq** — LLM (primary) | https://console.groq.com |
| **Render** — Java hosting | https://render.com |
| **Vercel** — Frontend | https://vercel.com |

### 3. Configure
```bash
cp .env.example .env
# Fill in NEON_URL, REDIS_URL, GROQ_API_KEY
```

### 4. Run tests
```bash
pip install pytest
pytest e2e-tests -q          # 475 tests, ~2s
python stress/aquapulse_stress.py   # algorithm harness
```

### 5. Build & run locally
```bash
mvn clean package -DskipTests
java -jar verify-service/target/*.jar &
java -jar allocation-service/target/*.jar &
java -jar guarantee-service/target/*.jar &
java -jar copilot-service/target/*.jar &
java -jar api-gateway/target/*.jar &

cd frontend && npm install && npm run dev
```

### 6. Deploy to cloud
- **Render**: `render.yaml` is pre-configured for 5 Java services
- **Vercel**: `vercel.json` deploys the React PWA from `frontend/`

---

## Zone-A Worked Example (Acceptance Test)

| Farmer | Reported (h) | Elec-Implied (h) | Trust | Verified (h) | Allocated (h) |
|---|---|---|---|---|---|
| A | 28.0 | 28.0 | 1.000 | 28.0 | 28.0 |
| B | 30.0 | 30.0 | 1.000 | 30.0 | 30.0 |
| C | 20.0 | 50.0 | 0.400 | 38.0 | **26.0** |
| D | 38.0 | 36.0 | 0.947 | 28.8 | 20.0 |

- Verified total: **124.8 h** | Stress: **96.0% → Critical** | Weekly pool: **104.0 h**
- All numbers reproduced exactly by `stress/aquapulse_stress.py` [M = measured]

---

## Hard Invariants

1. **`DIGNITY_FLOOR_M3 = 5.0`** — static final constant, never from DB or request
2. **NumericGroundingValidator** — every LLM number token validated ±0.05 against source DTO
3. **copilot-service is read-only** — no write-capable repository references
4. **Full traceability** — every allocation carries `(m*, confidence, κ_v, dataCoverage, modelHash)`

---

## Key Files

| File | Purpose |
|---|---|
| `stress/aquapulse_stress.py` | Ground-truth algorithm reference (all numbers [M]) |
| `db/migration/` | Flyway V1–V3 Postgres schema + Zone-A seed data |
| `aquapulse-common/` | Shared constants, MerkleTree, DTOs |
| `verify-service/` | Trust + Bayesian verification |
| `allocation-service/` | Land-proportional allocation + Merkle receipts |
| `guarantee-service/` | Theis E1 + ACSY safe-yield |
| `copilot-service/` | Anti-hallucination AI copilot |
| `api-gateway/` | Spring Cloud Gateway |
| `frontend/` | React 18 bilingual dashboard |
| `e2e-tests/` | 475 passing tests across 4 tiers |
| `.env.example` | All required env vars |
| `render.yaml` | Render.com deploy config |
| `vercel.json` | Vercel deploy config |

---

> **Integrity note**: All numbers tagged [M] were measured by `stress/aquapulse_stress.py` on synthetic worlds — not field-proven. See `AquaPulse_v8_FAANG_FINAL.md` for full specification.
