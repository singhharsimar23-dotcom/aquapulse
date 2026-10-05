import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseAndValidateCsv,
  trustBlend,
  waterFill,
  escrowSplit,
  computeSoe,
} from '../src/index.js';

const SAMPLE_CSV_PATH = path.resolve(__dirname, '../../../public/samples/zone_a_week10.csv');

describe('CSV Parsing and §6.11 Reproduction Tests', () => {
  it('sample CSV reproduces §6.11 exactly', () => {
    const csvContent = fs.readFileSync(SAMPLE_CSV_PATH, 'utf-8');
    const { rows, sha256 } = parseAndValidateCsv(csvContent);

    expect(sha256).toBeDefined();
    expect(rows.length).toBe(4);

    // Extract columns
    const R = rows.map((r) => r.reportedHours);
    const E = rows.map((r) => r.meterHours);
    const L = rows.map((r) => Number(r.landAcres));
    const Q = rows.map((r) => Number(r.wellDischargeM3h));

    expect(R).toEqual([28, 30, 20, 38]);
    expect(E).toEqual([28, 30, 50, 36]);
    expect(L).toEqual([7.0, 7.5, 5.0, 9.5]);
    expect(Q).toEqual([1, 1, 1, 1]);

    // Compute trust blend
    const tb = rows.map((r) => trustBlend(r.reportedHours, r.meterHours));
    const T = tb.map((x) => x.T);
    const lam = tb.map((x) => x.lam);
    const U = tb.map((x) => x.U);
    const review = tb.map((x) => x.flags.includes('REVIEW'));

    expect(T.map((v) => Math.round(v! * 1e4) / 1e4)).toEqual([1.0, 1.0, 0.4, 0.9474]);
    expect(lam.map((v) => Math.round(v! * 1e4) / 1e4)).toEqual([0.0, 0.0, 0.6, 0.0526]);
    expect(U.map((v) => Math.round(v * 1e3) / 1e3)).toEqual([28.0, 30.0, 38.0, 37.895]);
    expect(review).toEqual([false, false, true, false]);

    const sumU = U.reduce((a, b) => a + b, 0);
    expect(Math.abs(sumU - 133.8947368)).toBeLessThan(1e-4);

    // SOE checks with B_REF = 130
    const B_REF = 130.0;
    const soeVer = computeSoe(sumU, B_REF);
    expect(Math.round(soeVer.soePct * 10) / 10).toBe(103.0);
    expect(soeVer.tier).toBe('Over-exploited');

    const sumR = R.reduce((a, b) => a! + b!, 0)!;
    const soeRep = computeSoe(sumR, B_REF);
    expect(Math.round(soeRep.soePct * 10) / 10).toBe(89.2);
    expect(soeRep.tier).toBe('Semi-critical');

    const sumE = E.reduce((a, b) => a! + b!, 0)!;
    const soeMet = computeSoe(sumE, B_REF);
    expect(Math.round(soeMet.soePct * 10) / 10).toBe(110.8);
    expect(soeMet.tier).toBe('Over-exploited');

    // Pool 104 allocation
    const wf104 = waterFill(U, L, 104, 0.0);
    expect(wf104.alloc.map((v) => Math.round(v * 100) / 100)).toEqual([25.1, 26.9, 17.93, 34.07]);

    // Pool 104 escrow: scarcity -> nothing to escrow
    const esc104 = escrowSplit(wf104.alloc, R, E, review);
    expect(esc104.escrow).toEqual([0, 0, 0, 0]);

    // Pool 130 allocation
    const wf130 = waterFill(U, L, 130, 0.0);
    expect(wf130.alloc.map((v) => Math.round(v * 100) / 100)).toEqual([28.0, 30.0, 34.11, 37.89]);

    // Pool 130 escrow: Farmer C released 20.0, escrow 14.1053
    const esc130 = escrowSplit(wf130.alloc, R, E, review);
    expect(Math.abs(esc130.released[2] - 20.0)).toBeLessThan(1e-9);
    expect(Math.abs(esc130.escrow[2] - 14.105263)).toBeLessThan(1e-4);
  });

  it('rejects invalid numbers with row and column information', () => {
    const badCsv = `farmer_id,week,land_acres,well_discharge_m3h,reported_hours,meter_hours
F-A,2026-W10,invalid_acres,1,28,28`;

    expect(() => parseAndValidateCsv(badCsv)).toThrow(
      "Row 2, column 'land_acres': 'invalid_acres' is not a valid number"
    );
  });

  it('rejects negative hours', () => {
    const badHoursCsv = `farmer_id,week,land_acres,well_discharge_m3h,reported_hours,meter_hours
F-A,2026-W10,7.0,1,-5,28`;

    expect(() => parseAndValidateCsv(badHoursCsv)).toThrow(
      "Row 2, column 'reported_hours': negative hours rejected"
    );
  });

  it('rejects duplicate farmer-week records', () => {
    const dupCsv = `farmer_id,week,land_acres,well_discharge_m3h,reported_hours,meter_hours
F-A,2026-W10,7.0,1,28,28
F-A,2026-W10,7.0,1,28,28`;

    expect(() => parseAndValidateCsv(dupCsv)).toThrow(
      "Row 3: duplicate record for farmer 'F-A' in week '2026-W10'"
    );
  });

  it('warns on unknown columns without throwing', () => {
    const extraColCsv = `farmer_id,week,land_acres,well_discharge_m3h,reported_hours,meter_hours,custom_metadata
F-A,2026-W10,7.0,1,28,28,some_data`;

    const res = parseAndValidateCsv(extraColCsv);
    expect(res.warnings).toContain("Unknown column 'custom_metadata' ignored");
    expect(res.rows.length).toBe(1);
  });

  it('a CSV with a missing meter cell -> NO_METER, U=R', () => {
    const missingMeterCsv = `farmer_id,week,land_acres,well_discharge_m3h,reported_hours,meter_hours
F-A,2026-W10,7.0,1,28,
F-B,2026-W10,7.5,1,30,30`;

    const res = parseAndValidateCsv(missingMeterCsv);
    expect(res.rows[0].meterHours).toBeNull();
    expect(res.rows[0].reportedHours).toBe(28);

    const blend = trustBlend(res.rows[0].reportedHours, res.rows[0].meterHours);
    expect(blend.flags).toContain('NO_METER');
    expect(blend.U).toBe(28);
    expect(blend.T).toBeNull();
  });
});

