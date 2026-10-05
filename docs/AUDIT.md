# AquaPulse Component Audit (S0b)

| Component | Status | Action | Defect ID | File:Line |
| :--- | :--- | :--- | :--- | :--- |
| Frontend UI (`App.tsx`, Recharts) | BUILT | REPLACE | D1, D18 | frontend/src/App.tsx:1 |
| Map / Satellite View (MapLibre) | MISSING | REPLACE | D15, D18 | frontend/src/ |
| TS Math Core (`packages/core`) | MISSING | REPLACE | D2, D8, D9 | packages/core/ |
| `verify-service` (Trust/Bayesian) | BUILT | RETIRE (C) | D10, D23, D24 | verify-service/src/main/java/com/aquapulse/verify/TrustEngine.java:4 |
| `allocation-service` (Water-fill) | BUILT | RETIRE (C) | D2, D13, D19 | allocation-service/src/main/java/com/aquapulse/allocation/AllocationEngine.java:10 |
| `guarantee-service` (Theis/ACSY) | BUILT | RETIRE (C) | D3, D4, D8, D20 | guarantee-service/src/main/java/com/aquapulse/guarantee/AcsyEngine.java:7 |
| `copilot-service` (Grounding/LLM) | BUILT | RETIRE (C) | D5, D16 | copilot-service/src/main/java/com/aquapulse/copilot/CopilotService.java:1 |
| `api-gateway` (Spring Cloud Gateway) | BUILT | RETIRE (C) | D7 | api-gateway/src/main/resources/application.yml:7 |
| Redis Configuration (`Upstash`) | BUILT | RETIRE | D7 | aquapulse-common/src/main/java/com/aquapulse/common/config/UpstashRedisConfig.java:29 |
| DB Migrations (V1–V3 Flyway) | BUILT | ADAPT | D1 | db/migration/V3__seed_zone_a.sql:1 |
| Simulation Harness / E2E Tests | BUILT | ADAPT | D1, D2 | e2e-tests/harness/simulation_harness.py:1 |
| Python Oracle (`aquapulse_ref.py`) | BUILT | KEEP | None | reference/aquapulse_ref.py:1 |

## Audit Answers (a)–(i)
- (a) Frontend state: Static React 18 + Vite + TS + Recharts table/bar chart (77 lines); hardcodes flawed D=28.8h; zero maps or live API calls.
- (b) Java stack: Spring Boot 3.3.4, Java 21, Maven multi-module (`pom.xml`); `mvn test` (no JDK/Maven on host), `pytest e2e-tests/`.
- (c) Published cap source: Does not come from `guarantee-service` (which only outputs `mStar`); comes from literal `budgetHours=130.0` (in `simulation_harness.py:432` / `App.tsx:22`).
- (d) ACSY computation: Online gradient descent updating log-multiplier kappa via step eta * (err - alpha); outcome variable is binary miscoverage indicator I(realized > upperBound) on monitoring well drawdown.
- (e) Redis dependency: `UpstashRedisConfig` and gateway `REDIS_URL` intended for token-bucket rate limiting; no core business logic depends on Redis; safe to drop.
- (f) E2E live calls: 0/475 tests hit live services by default (run in-process against `AquaPulseSimulationHarness`). Only hits live services when `AQUAPULSE_TEST_TARGET=cloud`.
- (g) Repo visibility: Public (`https://github.com/singhharsimar23-dotcom/aquapulse`).
- (h) Allocation units & floor (D2): `AllocationEngine.java:23` naively mixes m³ constant (`DIGNITY_FLOOR_M3 = 5.0`) with hours (`pool`), using `Math.max(h, floor)` which breaks water conservation.
- (i) Missing/zero meter (D24): `TrustEngine.java:6` treats missing/zero meter as numeric 0, collapsing trust to 0 and cutting extraction/demand to 0 or penalizing farmer as liar.

## Superseded Tests (@legacy(D1))
- `test_f19_zone_a_verified_total` (`e2e-tests/tier1/test_f13_f19_verification_alloc.py:274`)
- `test_f19_zone_a_stress_score_and_curtailment` (`e2e-tests/tier1/test_f13_f19_verification_alloc.py:279`)
- `test_f19_zone_a_allocations_and_curtailment` (`e2e-tests/tier1/test_f13_f19_verification_alloc.py:291`)
- `test_f19_boundary_farmer_c_reduction_precision` (`e2e-tests/tier2/test_tier2_verification_boundaries.py:242`)
- `test_f19_boundary_verified_total_arithmetic` (`e2e-tests/tier2/test_tier2_verification_boundaries.py:252`)
- `test_f19_boundary_stress_score_precision` (`e2e-tests/tier2/test_tier2_verification_boundaries.py:256`)
- `test_inter_04_verified_hours_determines_cgwb_stress` (`e2e-tests/tier3/test_tier3_cross_feature.py:60`)
- `test_inter_05_cgwb_stress_scales_weekly_pool` (`e2e-tests/tier3/test_tier3_cross_feature.py:68`)
- `test_inter_30_seed_data_reproduces_full_zone_a_benchmark` (`e2e-tests/tier3/test_tier3_cross_feature.py:230`)
- `test_scenario_1_zone_a_worked_example_full_pipeline` (`e2e-tests/tier4/test_tier4_real_world.py:41`)
