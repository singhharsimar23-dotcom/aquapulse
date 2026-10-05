# S1b Handoff

- Done:
  - `packages/core/`: pure TS core (`trustBlend`, `waterFill`, `escrowSplit`, `applyCommitteeDecision`, `e1`/`theis`, `impact`, `merkle`, `bucketCap`, `csvParser`, `types`, branded units).
  - Vitest parity test suite: 21 tests pass across 5 suites reproducing golden vectors to 1e-9.
  - Property tests: 1,000 seeded cases each for all §6.5 invariants.
  - Merkle single-bit sensitivity and WebCrypto proof generation/verification verified.
  - Null never coerces to 0 invariant tested and verified.
  - Sample CSV (`public/samples/zone_a_week10.csv`) reproduces §6.11 exactly.
  - Gibbs & Candès ACI paper fetched, verified hash in `docs/verified.json`, bound in `docs/ACSY.md`.
  - `make verify S=S1b` exit 0; evidence logged to `docs/evidence/S1b.log`.
- Next: Session S2 (cap on server / bucket integration) or S3/S4.
- Blocked: None.
