import { describe, it, expect } from 'vitest';
import { isProvKind, isProvReason, PROV_META } from '../lib/prov';
import { computeTier0, SnapshotData } from '../lib/snapshotLoader';

describe('Provenance Rules (§8.6 & §8.3)', () => {
  it('validates allowed provenance kinds', () => {
    expect(isProvKind('LIVE')).toBe(true);
    expect(isProvKind('REPLAY')).toBe(true);
    expect(isProvKind('SYNTH')).toBe(true);
    expect(isProvKind('ASSUMPTION')).toBe(true);
    expect(isProvKind('USER')).toBe(true);
    expect(isProvKind('UNKNOWN')).toBe(false);
  });

  it('validates allowed exemption reasons', () => {
    const valid = ['date', 'version', 'axis-tick', 'scene-id', 'hash', 'map-control', 'id'];
    for (const r of valid) {
      expect(isProvReason(r)).toBe(true);
    }
    expect(isProvReason('other')).toBe(false);
  });

  it('matches required provenance colors and letters per §8.3', () => {
    expect(PROV_META.LIVE.color).toBe('#4CC9F0');
    expect(PROV_META.LIVE.letter).toBe('L');
    expect(PROV_META.REPLAY.color).toBe('#7C93B5');
    expect(PROV_META.REPLAY.letter).toBe('R');
    expect(PROV_META.SYNTH.color).toBe('#9B8CFF');
    expect(PROV_META.SYNTH.letter).toBe('S');
    expect(PROV_META.ASSUMPTION.color).toBe('#FFB547');
    expect(PROV_META.ASSUMPTION.letter).toBe('A');
    expect(PROV_META.USER.color).toBe('#F0A6FF');
    expect(PROV_META.USER.letter).toBe('U');
  });
});

describe('Tier-0 Snapshot Computation Engine', () => {
  const sampleSnapshot: SnapshotData = {
    zone: 'Zone-A',
    district: 'Wardha',
    state: 'Maharashtra',
    week: 10,
    asOf: '2026-10-05T00:00:00Z',
    source: 'SYNTH',
    hash: 'test-hash',
    B_REF: 130.0,
    pool: 104.0,
    SOE_reports_pct: 89.2,
    SOE_meter_pct: 110.8,
    SOE_verified_pct: 103.0,
    sumU: 133.895,
    tier_reports: 'Semi-critical',
    tier_meter: 'Over-exploited',
    tier_verified: 'Over-exploited',
    farmers: [
      { id: 'A', name: 'Farmer A', land: 7.0, R: 28.0, E: 28.0, Q: 1.0, flags: [], coords: [78.602, 20.745] },
      { id: 'B', name: 'Farmer B', land: 7.5, R: 30.0, E: 30.0, Q: 1.0, flags: [], coords: [78.605, 20.748] },
      { id: 'C', name: 'Farmer C', land: 5.0, R: 20.0, E: 50.0, Q: 1.0, flags: ['REVIEW'], coords: [78.598, 20.742] },
      { id: 'D', name: 'Farmer D', land: 9.5, R: 38.0, E: 36.0, Q: 1.0, flags: [], coords: [78.608, 20.740] },
    ],
    provenance: {},
  };

  const defaultAssumptions = {
    lambda_max: 0.6,
    review_mismatch: 0.5,
    floor_m3: 0.0,
    P_rated: 5.0,
    Kc_min: 0.2,
    Kc_max: 1.15,
  };

  it('computes exact golden vectors for pool 104 without server', () => {
    const model = computeTier0(sampleSnapshot, defaultAssumptions, false);

    expect(model.farmers).toHaveLength(4);
    expect(model.SOE_reports_pct).toBeCloseTo(89.23, 1);
    expect(model.SOE_meter_pct).toBeCloseTo(110.77, 1);
    expect(model.SOE_verified_pct).toBeCloseTo(103.0, 1);

    // Farmer C has REVIEW flag due to mismatch |20 - 50| / 50 = 0.6 > 0.5
    const farmerC = model.farmers.find((f) => f.id === 'C')!;
    expect(farmerC.flags).toContain('REVIEW');
    expect(farmerC.U).toBeCloseTo(38.0, 1);
    expect(farmerC.alloc).toBeCloseTo(17.93, 1);

    // Sum of allocations equals pool 104
    const totalAlloc = model.farmers.reduce((sum, f) => sum + f.alloc, 0);
    expect(totalAlloc).toBeCloseTo(104.0, 2);

    // Merkle root is computed and non-empty 64-char hex
    expect(model.merkleRoot).toHaveLength(64);
  });
});
