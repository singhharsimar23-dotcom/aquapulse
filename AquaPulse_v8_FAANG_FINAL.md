# AquaPulse v8 — "Verify, Then Allocate," Made Provable
## The Guaranteed Water Ledger: combining the submitted proposal with a stress-tested guarantee engine

### Status
Final build spec. Every number tagged [M] below was measured by the harness in stress/aquapulse_stress.py in this session, on synthetic worlds — not field-proven.

### Constraints honored
Zero paid infrastructure. No credit card anywhere in the primary path. Every service named below has a real no‑CC free tier, checked this session.

### Evidence tags
[M] measured by code in this session (stress/) · [R] read from a live source this session · [P] from the submitted proposal, not independently verified · [D] design decision · [U] unverified / not run

---

## 0. Executive verdict
Build AquaPulse as submitted, engineered as JalSabha. The submission's pitch — verify, then allocate — is correct and is what you pitch to the judges. What changes underneath is how verification and allocation are done:

| Layer | Submitted proposal | This build |
| :--- | :--- | :--- |
| **Verify** | $T = 1 - |R-E|/\max(R,E)$, a hand-checkable formula | Same formula stays as the farmer-facing explanation of trust; underneath, weights come from a Bayesian per-reporter reliability model validated against the same electricity-anomaly logic |
| **Confidence number** | A single illustrative "82%" in the worked example | A conformal-calibrated coverage guarantee (ACSY) that earns a number like that and corrects itself when wrong — §5.2–5.3 |
| **Stress score → pool** | CGWB tier thresholds, fixed tier factors | Same tiers, same factors, plus a physics‑based safe‑yield ceiling underneath so the pool can never licence more water than the aquifer can give back |
| **Allocation** | Land-proportional | Land‑proportional stays the default and the one shown to judges; a Karma‑credit mode with a non‑negotiable dignity floor is built and demoed as the advanced alternative — §5.5 |
| **AI** | Rule/statistics anomaly check, simple trend, one LLM sentence | Same three jobs, rebuilt on Spring AI 1.1 with MCP tools, structured‑output validation, and a numeric‑grounding advisor that makes hallucinated figures structurally impossible — §6 |

---

## 1. Continuity with the submitted proposal
The Zone‑A worked example in the submission (§2.5.1) is kept, verbatim, as a unit test. Four farmers, 20 acres, 130‑hour budget, Farmer C flagged. The demo must reproduce:
- **Reported total:** 116.0 h
- **Electricity-implied:** 144.0 h
- **Verified (trust-weighted):** 124.8 h
- **Stress score:** 96.0% → Critical
- **Weekly pool:** 104.0 h
- **Farmer C allocation:** 26.0 h (verified use 38.0 h, −32%)

---

## 2. Invariants
1. The dignity floor is a `static final` code constant, never a request parameter.
2. `allocation-service` never publishes a number without `(m, confidence, kappa, data_coverage, model_hash)` attached.
3. `copilot-service` (the LLM layer) has no write path to the ledger, the cap, or the allocation table — verified by an integration test that asserts the copilot's Spring beans hold no repository reference that isn't `@Transactional(readOnly = true)`.
4. Same seed + same inputs $\implies$ same bytes, everywhere numeric — enforced by a determinism test in CI.
5. Every LLM-authored sentence is checked against the numbers it describes before it reaches a farmer (§6.4).

---

## 3. Data Model (PostgreSQL / Neon)
```sql
create table zones(
  id text primary key,
  gec_unit text,
  dcrit_m numeric,
  region text
);

create table farmers(
  id text primary key,
  zone text references zones,
  acres numeric,
  floor_m3 numeric not null default 0,
  karma numeric not null default 10
);

create table readings(
  id text primary key,
  farmer_id text references farmers,
  t_event timestamptz,
  reported_hours numeric,
  electricity_implied_hours numeric,
  trust numeric,
  verified_hours numeric,
  prov text check (prov in ('LIVE','REPLAY','SYNTH')),
  sig text
);

create table village_kappa(
  village_id text primary key,
  kappa numeric not null default 1.0,
  ess numeric,
  seasons_observed integer not null default 0,
  last_updated timestamptz not null default now()
);

create table seasons(
  id text primary key,
  zone text references zones,
  start_date date,
  end_date date,
  cap_multiplier numeric,
  kappa numeric,
  confidence numeric,
  model_hash text,
  outcome_ok boolean
);

create table allocations(
  id text primary key,
  season text references seasons,
  farmer_id text references farmers,
  hours numeric,
  credits_spent numeric,
  cert_hash text not null
);

create table ledger_roots(
  day date primary key,
  root text not null,
  chain text
);

create table audit_queue(
  farmer_id text references farmers,
  season text references seasons,
  z_score numeric,
  status text default 'open',
  verified_by text
);

create table rule_proposals(
  id text primary key,
  proposed_by text,
  raw_text text,
  structured_json jsonb,
  safety_flags jsonb,
  status text default 'pending_review'
);

-- RAG store (Neon + pgvector)
create extension if not exists vector;
create table doc_chunks(
  id bigserial primary key,
  source text,
  content text,
  embedding vector(768)
);
create index on doc_chunks using hnsw (embedding vector_cosine_ops);
```

---

## 4. API Surface
- `POST /api/readings` — idempotent; farmer report ingestion
- `GET /api/zones/{id}/status` — current stress score, category, confidence, pool
- `GET /api/zones/{id}/allocations` — this season's allocation table
- `GET /api/farmers/{id}/allocation` — one farmer's row, with cert_hash
- `GET /api/verify/{cert_hash}` — recompute Merkle proof, pass/fail
- `POST /api/season/{id}/close` — feedback -> updates village_kappa (ACSY)
- `POST /api/rule-proposals` — Rule Lab: NL text in, structured proposal out
- `POST /api/rule-proposals/{id}/approve` — human approval -> rule goes live
- `GET /api/audit-queue?zone=` — flagged farmers for human verification
- `GET /api/copilot/explain?zone=` — bilingual explanation (grounded, §6.4)
- `POST /api/copilot/ask` — RAG committee assistant (§6.5)
- `GET /api/gov/units?format=gec` — CGWB-category rollup for government view

---

## 5. Algorithms & Mathematical Porting

### 5.1 E1 Exponential Integral (Appendix §15.1)
Matches `scipy.special.exp1` with test vectors:
- $E_1(0.01) = 4.037930$
- $E_1(0.1) = 1.822924$
- $E_1(0.5) = 0.559774$
- $E_1(1.0) = 0.219384$
- $E_1(2.0) = 0.048901$
- $E_1(5.0) = 0.0011483$
- $E_1(10.0) = 4.157 \times 10^{-6}$

### 5.2 Posterior Tempering with ESS $\ge 150$ (§15.2)
Bisection for temperature $\lambda \in [0, 1]$ such that effective sample size $\text{ESS}(\lambda) \ge 150$.

### 5.3 ACSY Update Loop (§15.3)
$\log \kappa_v \leftarrow \log \kappa_v + \eta (\text{err} - \alpha)$ with $\alpha = 0.10, \eta = 0.3$, clamped to $[-1.5, 3.0]$.

### 5.4 Merkle Receipts (§15.5)
$\text{leaf}(salt, value) = \text{SHA256}(0x00 \parallel salt \parallel value)$
$\text{node}(left, right) = \text{SHA256}(0x01 \parallel left \parallel right)$

### 5.5 Numeric Grounding Validator (§6.3)
Regex match: `-?\d+(\.\d+)?%?`. Every token must match a source number in DTO within $\pm 0.05$. On failure, fallback to deterministic template:
`"Zone {{zone_id}} is {{category}} at {{stress_score}}% of its safe weekly budget ({{confidence}}% confidence). This week's pool is {{pool_hours}} hours."`
