# Oracle Diff (S0a)

- Status: Blocked pending proposal and panel documents in `docs/inputs/`.
- `tests/golden/submitted_zone_a.json` extraction skipped per deviation instructions.
- Blocker logged in `docs/BLOCKERS.md`: `BLOCKED: S0a-inputs: need docs/inputs`.
- Reference fixtures in `tests/golden/` generated from canonical oracle `reference/aquapulse_ref.py`:
  - `tests/golden/v9_zone_a.json` (Zone A canonical vectors matching §6.11)
  - `tests/golden/e1_vectors.json` (Theis E1 reference values)
  - `tests/golden/merkle_vectors.json` (Merkle tree vectors)
  - `tests/golden/impact_vectors.json` (Impact meter vectors)
