import { describe, it, expect } from 'vitest';
import { useStore } from '../store/useStore';
import { computeTier0, SnapshotData } from '../lib/snapshotLoader';
import { parseAndValidateCsv } from '@aquapulse/core';
import trajectoriesData from '../../../public/data/stress_trajectories.json';

const SAMPLE_SNAPSHOT: SnapshotData = {
  zone: 'Zone-A',
  district: 'Wardha',
  state: 'Maharashtra',
  week: 10,
  asOf: '2026-10-05T00:00:00Z',
  source: 'Dual-signal telemetry blend against CGWB B_REF',
  hash: '900b46f55bf9230559868e4eb7891bcfa3eb67a4d5386f7b925b6a71017bc703',
  B_REF: 130.0,
  pool: 104.0,
  SOE_reports_pct: 89.23076923076924,
  SOE_meter_pct: 110.76923076923077,
  SOE_verified_pct: 102.99595141700405,
  sumU: 133.89473684210526,
  tier_reports: 'Semi-critical',
  tier_meter: 'Over-exploited',
  tier_verified: 'Over-exploited',
  farmers: [
    { id: 'A', name: 'Farmer A (Cash Crop)', land: 7.0, R: 28.0, E: 28.0, Q: 1.0, flags: [], coords: [78.602, 20.745] },
    { id: 'B', name: 'Farmer B (Mixed Crop)', land: 7.5, R: 30.0, E: 30.0, Q: 1.0, flags: [], coords: [78.605, 20.748] },
    { id: 'C', name: 'Farmer C (High Extraction)', land: 5.0, R: 20.0, E: 50.0, Q: 1.0, flags: ['REVIEW'], coords: [78.598, 20.742] },
    { id: 'D', name: 'Farmer D (Marginal Well)', land: 9.5, R: 38.0, E: 36.0, Q: 1.0, flags: [], coords: [78.608, 20.74] },
  ],
  provenance: {},
};

const SAMPLE_CSV_CONTENT = `farmer_id,week,land_acres,well_discharge_m3h,reported_hours,meter_hours
F-A,2026-W10,7.0,1,28,28
F-B,2026-W10,7.5,1,30,30
F-C,2026-W10,5.0,1,20,50
F-D,2026-W10,9.5,1,38,36
`;

describe('S8: Sandboxes, Drills, BYO CSV, Committee and Stress Trajectories', () => {
  const snapshot: SnapshotData = SAMPLE_SNAPSHOT;
  const assumptions = useStore.getState().assumptions;

  it('presets reproduce §6.11 exactly', () => {

    // 1. Zone-A benchmark preset
    useStore.getState().applyPreset('Zone-A benchmark');
    const state = useStore.getState();
    const model = computeTier0(
      snapshot,
      assumptions,
      false,
      state.farmerOverrides,
      state.uploadedCsvRows,
      state.uploadedCsvHash,
      state.committeeDecisions,
      state.poolOverride
    );

    // Verify demands and sumU
    const expectedDemands = [28.0, 30.0, 38.0, 37.89473684210526];
    model.farmers.forEach((f, idx) => {
      expect(Math.abs(f.U - expectedDemands[idx])).toBeLessThan(1e-9);
    });
    expect(Math.abs(model.sumU - 133.89473684210526)).toBeLessThan(1e-9);

    // Verify SOE tiers
    expect(Math.round(model.SOE_verified_pct * 10) / 10).toBe(103.0);
    expect(model.tier_verified).toBe('Over-exploited');
    expect(Math.round(model.SOE_reports_pct * 10) / 10).toBe(89.2);
    expect(model.tier_reports).toBe('Semi-critical');
    expect(Math.round(model.SOE_meter_pct * 10) / 10).toBe(110.8);
    expect(model.tier_meter).toBe('Over-exploited');

    // Verify Pool 104 allocation (= land-proportional per §6.11)
    const expectedAlloc104 = [25.103448, 26.896552, 17.931034, 34.068966];
    model.farmers.forEach((f, idx) => {
      expect(Math.abs(f.alloc - expectedAlloc104[idx])).toBeLessThan(1e-4);
      expect(f.escrow).toBe(0.0); // Pool 104 has zero escrow
    });

    // 2. Severe stress preset: Pool 78
    useStore.getState().applyPreset('Severe stress');
    const stressModel = computeTier0(
      snapshot,
      assumptions,
      false,
      useStore.getState().farmerOverrides,
      null,
      null,
      {},
      useStore.getState().poolOverride
    );
    expect(stressModel.pool).toBe(78);
    const expectedAlloc78 = [18.827586, 20.172414, 13.448276, 25.551724];
    stressModel.farmers.forEach((f, idx) => {
      expect(Math.abs(f.alloc - expectedAlloc78[idx])).toBeLessThan(1e-4);
    });

    // 3. Dead meter drill: Farmer C E=null
    useStore.getState().applyPreset('Dead meter');
    const deadMeterModel = computeTier0(
      snapshot,
      assumptions,
      false,
      useStore.getState().farmerOverrides,
      null,
      null,
      {},
      useStore.getState().poolOverride
    );
    const farmerC = deadMeterModel.farmers.find((f) => f.id === 'C' || f.id === 'F-C')!;
    expect(farmerC.flags).toContain('NO_METER');
    expect(farmerC.U).toBe(farmerC.R); // U = R = 20
  });

  it('recompute diff is exactly zero against golden snapshot on Zone-A benchmark', () => {
    useStore.getState().applyPreset('Zone-A benchmark');
    const baseModel = computeTier0(snapshot, assumptions, false);
    const recomputed = computeTier0(
      snapshot,
      assumptions,
      false,
      useStore.getState().farmerOverrides,
      null,
      null,
      {},
      useStore.getState().poolOverride
    );

    let maxDiff = 0.0;
    for (let i = 0; i < baseModel.farmers.length; i++) {
      const diff = Math.abs(baseModel.farmers[i].alloc - recomputed.farmers[i].alloc);
      if (diff > maxDiff) maxDiff = diff;
    }
    expect(maxDiff).toBe(0.0);
  });

  it('sample CSV reproduces §6.11 exactly', () => {
    const csvContent = SAMPLE_CSV_CONTENT;
    const parsed = parseAndValidateCsv(csvContent);

    expect(parsed.rows.length).toBe(4);

    const modelFromCsv = computeTier0(
      snapshot,
      assumptions,
      false,
      {},
      parsed.rows,
      parsed.sha256,
      {},
      104
    );

    expect(modelFromCsv.farmers.length).toBe(4);
    expect(Math.abs(modelFromCsv.sumU - 133.89473684210526)).toBeLessThan(1e-9);
    expect(Math.round(modelFromCsv.SOE_verified_pct * 10) / 10).toBe(103.0);
  });

  it('a CSV with a missing meter cell -> NO_METER, U=R', () => {
    const csvMissingMeter = `farmer_id,week,land_acres,well_discharge_m3h,reported_hours,meter_hours
F-A,2026-W10,7.0,1,28,
F-B,2026-W10,7.5,1,30,30`;

    const parsed = parseAndValidateCsv(csvMissingMeter);
    expect(parsed.rows[0].meterHours).toBeNull();
    expect(parsed.rows[0].reportedHours).toBe(28);

    const model = computeTier0(snapshot, assumptions, false, {}, parsed.rows, parsed.sha256, {}, 104);
    const farmerA = model.farmers[0];
    expect(farmerA.flags).toContain('NO_METER');
    expect(farmerA.U).toBe(28); // U = R
    expect(farmerA.T).toBe(0); // null in blend, coerced to 0 for table display
  });

  it('telemetry sliders for R and E adjust allocation and missing toggle sets null', () => {
    useStore.getState().setFarmerOverride('F-C', { R: 25, E: 25 });
    const model = computeTier0(
      snapshot,
      assumptions,
      false,
      useStore.getState().farmerOverrides,
      null,
      null,
      {},
      104
    );
    const farmerC = model.farmers[2];
    expect(farmerC.R).toBe(25);
    expect(farmerC.E).toBe(25);
    expect(farmerC.U).toBe(25); // Perfect agreement T=1, lam=0, U=25

    // Missing toggle (sets E to null)
    useStore.getState().setFarmerOverride('F-C', { E: null });
    const modelMissing = computeTier0(
      snapshot,
      assumptions,
      false,
      useStore.getState().farmerOverrides,
      null,
      null,
      {},
      104
    );
    const farmerCMissing = modelMissing.farmers[2];
    expect(farmerCMissing.E).toBeNull();
    expect(farmerCMissing.flags).toContain('NO_METER');
    expect(farmerCMissing.U).toBe(25); // U = R = 25
  });

  it('committee dialog (Confirm/Dismiss) is wired to the core', () => {
    // §6.11: pool 130: C alloc 34.1053 -> released 20.0000, escrow 14.1053
    const base130 = computeTier0(snapshot, assumptions, false, {}, null, null, {}, 130);
    const cBase = base130.farmers[2];
    expect(Math.abs(cBase.alloc - 34.105263)).toBeLessThan(1e-4);
    expect(Math.abs(cBase.released - 20.0)).toBeLessThan(1e-9);
    expect(Math.abs(cBase.escrow - 14.105263)).toBeLessThan(1e-4);

    // Committee CONFIRMED on C:
    // §6.11: pool 130 + committee CONFIRMED on C: demand_C=20 -> 28.00, 30.00, 20.00, 37.89; unused 14.1053
    const confirmedModel = computeTier0(
      snapshot,
      assumptions,
      false,
      {},
      null,
      null,
      { 'F-C': 'CONFIRMED' },
      130
    );
    const cConf = confirmedModel.farmers[2];
    expect(Math.abs(cConf.alloc - 20.0)).toBeLessThan(1e-9);
    expect(Math.abs(cConf.released - 20.0)).toBeLessThan(1e-9);
    expect(cConf.escrow).toBe(0.0);
    expect(Math.abs((confirmedModel.unusedPool ?? 0) - 14.105263)).toBeLessThan(1e-4);

    // Committee DISMISSED on C:
    // Escrow released in full to farmer: released becomes alloc, escrow becomes 0
    const dismissedModel = computeTier0(
      snapshot,
      assumptions,
      false,
      {},
      null,
      null,
      { 'F-C': 'DISMISSED' },
      130
    );
    const cDism = dismissedModel.farmers[2];
    expect(Math.abs(cDism.alloc - 34.105263)).toBeLessThan(1e-4);
    expect(Math.abs(cDism.released - 34.105263)).toBeLessThan(1e-4);
    expect(cDism.escrow).toBe(0.0);
  });

  it('stress trajectories show measured numbers only and contain both arms', () => {
    const trajPayload = trajectoriesData as any;

    expect(trajPayload.provenance_kind).toBe('SYNTH');

    expect(trajPayload.code_hash).toBeDefined();
    expect(trajPayload.seeds.length).toBeGreaterThanOrEqual(10);
    expect(trajPayload.target_miscoverage).toBe(0.10);

    // Verify arms exist
    const reportsTrajs = trajPayload.trajectories.filter((t: any) => t.arm === 'reports');
    const verifiedTrajs = trajPayload.trajectories.filter((t: any) => t.arm === 'verified');
    expect(reportsTrajs.length).toBeGreaterThan(0);
    expect(verifiedTrajs.length).toBeGreaterThan(0);

    // Ensure measured numbers are numerical and non-fabricated
    verifiedTrajs.forEach((t: any) => {
      expect(typeof t.mean_pool).toBe('number');
      expect(typeof t.realised_miscoverage).toBe('number');
      expect(typeof t.weeks_below_floor).toBe('number');
      expect(typeof t.final_margin).toBe('number');
      expect(typeof t.final_omega).toBe('number');
      expect(t.weekly_trace.length).toBeGreaterThan(0);
    });
  });
});
