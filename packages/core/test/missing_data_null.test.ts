import { describe, it, expect } from 'vitest';
import { trustBlend } from '../src/trustBlend.js';
import { parseAndValidateCsv } from '../src/csvParser.js';
import { escrowSplit } from '../src/escrowSplit.js';

describe('Missing Data & Null Invariant Tests', () => {
  it('null never coerces to 0 in trustBlend', () => {
    // 1. Both null: NO_DATA flag, U=0
    const noData = trustBlend(null, null);
    expect(noData.T).toBeNull();
    expect(noData.lam).toBeNull();
    expect(noData.mismatch).toBeNull();
    expect(noData.flags).toEqual(['NO_DATA']);
    expect(noData.U).toBe(0.0);

    // 2. Meter missing (E=null): NO_METER flag, U=R
    const noMeter = trustBlend(30.0, null);
    expect(noMeter.T).toBeNull();
    expect(noMeter.lam).toBeNull();
    expect(noMeter.mismatch).toBeNull();
    expect(noMeter.flags).toEqual(['NO_METER']);
    expect(noMeter.U).toBe(30.0);

    // Contrast with coercion to 0:
    // If E had coerced to 0, max(30, 0)=30, mismatch=1, T=0, lam=0.6, U = (1-0.6)*30 + 0 = 12 != 30!
    const coercedE0 = trustBlend(30.0, 0.0);
    expect(coercedE0.U).toBe(12.0);
    expect(noMeter.U).not.toBe(coercedE0.U);

    // 3. Report missing (R=null): NO_REPORT flag, U=E
    const noReport = trustBlend(null, 40.0);
    expect(noReport.T).toBeNull();
    expect(noReport.lam).toBeNull();
    expect(noReport.mismatch).toBeNull();
    expect(noReport.flags).toEqual(['NO_REPORT']);
    expect(noReport.U).toBe(40.0);

    // Contrast with coercion to 0:
    // If R had coerced to 0, max(0, 40)=40, mismatch=1, T=0, lam=0.6, U = 0 + 0.6*40 = 24 != 40!
    const coercedR0 = trustBlend(0.0, 40.0);
    expect(coercedR0.U).toBe(24.0);
    expect(noReport.U).not.toBe(coercedR0.U);
  });

  it('null is strictly preserved by CSV parser and never converted to 0', () => {
    const csvWithNulls = `farmer_id,week,land_acres,well_discharge_m3h,reported_hours,meter_hours
F-1,2026-W10,5.0,1,,40
F-2,2026-W10,6.0,1,30,
F-3,2026-W10,7.0,1,,
F-4,2026-W10,8.0,1,0,0`;

    const parsed = parseAndValidateCsv(csvWithNulls);
    expect(parsed.rows.length).toBe(4);

    // F-1: reported_hours is null
    expect(parsed.rows[0].reportedHours).toBeNull();
    expect(parsed.rows[0].reportedHours).not.toBe(0);
    expect(parsed.rows[0].meterHours).toBe(40);

    // F-2: meter_hours is null
    expect(parsed.rows[1].reportedHours).toBe(30);
    expect(parsed.rows[1].meterHours).toBeNull();
    expect(parsed.rows[1].meterHours).not.toBe(0);

    // F-3: both null
    expect(parsed.rows[2].reportedHours).toBeNull();
    expect(parsed.rows[2].meterHours).toBeNull();

    // F-4: literal 0 is 0
    expect(parsed.rows[3].reportedHours).toBe(0);
    expect(parsed.rows[3].meterHours).toBe(0);
  });

  it('escrowSplit handles missing data without assuming 0', () => {
    // If a farmer is flagged REVIEW but meter is missing (e.g. dead meter),
    // escrow is not taken from min(R, null). All allocated water is released.
    const split = escrowSplit([30.0], [30.0], [null], [true]);
    expect(split.released[0]).toBe(30.0);
    expect(split.escrow[0]).toBe(0.0);
  });
});
