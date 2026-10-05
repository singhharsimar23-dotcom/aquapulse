import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  trustBlend,
  waterFill,
  escrowSplit,
  applyCommitteeDecision,
  e1,
  cooperJacob,
  kwhPerM3,
  computeImpact,
  leafSync,
  rootSync,
  rootDuplicateOddWrongSync,
  fmt6,
} from '../src/index.js';

const GOLDEN_DIR = path.resolve(__dirname, '../../../tests/golden');

function loadJson(filename: string) {
  const p = path.join(GOLDEN_DIR, filename);
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

describe('Golden Parity Tests (1e-9 tolerance)', () => {
  it('reproduces v9_zone_a.json exactly', () => {
    const golden = loadJson('v9_zone_a.json');
    const { land, R, E, B_REF } = golden.inputs;

    // 1. trustBlend
    const tb = R.map((r: number, i: number) => trustBlend(r, E[i]));
    const T = tb.map((x) => x.T);
    const lam = tb.map((x) => x.lam);
    const U = tb.map((x) => x.U);
    const review = tb.map((x) => x.flags.includes('REVIEW'));

    for (let i = 0; i < 4; i++) {
      expect(Math.abs(T[i]! - golden.T[i])).toBeLessThan(1e-9);
      expect(Math.abs(lam[i]! - golden.lam[i])).toBeLessThan(1e-9);
      expect(Math.abs(U[i] - golden.U[i])).toBeLessThan(1e-9);
      expect(review[i]).toBe(golden.review[i]);
    }

    const sumU = U.reduce((a, b) => a + b, 0);
    expect(Math.abs(sumU - golden.sumU)).toBeLessThan(1e-9);

    const soeVerified = (sumU / B_REF) * 100;
    const soeReports = (R.reduce((a: number, b: number) => a + b, 0) / B_REF) * 100;
    const soeMeter = (E.reduce((a: number, b: number) => a + b, 0) / B_REF) * 100;

    expect(Math.abs(soeVerified - golden.SOE_verified_pct)).toBeLessThan(1e-9);
    expect(Math.abs(soeReports - golden.SOE_reports_pct)).toBeLessThan(1e-9);
    expect(Math.abs(soeMeter - golden.SOE_meter_pct)).toBeLessThan(1e-9);

    // 2. waterFill across golden pools & floors
    for (const [key, expectedObj] of Object.entries<any>(golden.waterfill)) {
      const match = key.match(/^pool(\d+)_floor(\d+)$/);
      expect(match).not.toBeNull();
      const P = Number(match![1]);
      const f = Number(match![2]);

      const res = waterFill(U, land, P, f);
      expect(res.floorInfeasible).toBe(expectedObj.floor_infeasible);
      for (let i = 0; i < 4; i++) {
        expect(Math.abs(res.alloc[i] - expectedObj.alloc[i])).toBeLessThan(1e-9);
      }
    }

    // 3. escrowSplit on pool130 and pool104
    for (const P of [130, 104]) {
      const expectedObj = golden.escrow[`pool${P}`];
      const wf = waterFill(U, land, P, 0.0);
      const split = escrowSplit(wf.alloc, R, E, review);

      for (let i = 0; i < 4; i++) {
        expect(Math.abs(split.released[i] - expectedObj.released[i])).toBeLessThan(1e-9);
        expect(Math.abs(split.escrow[i] - expectedObj.escrow[i])).toBeLessThan(1e-9);
      }
    }

    // 4. committee CONFIRMED decision on farmer C
    const expectedConfirmed = golden.escrow['pool130_committee_CONFIRMED_on_C'];
    const wf130 = waterFill(U, land, 130, 0.0);
    const split130 = escrowSplit(wf130.alloc, R, E, review);

    const commRes = applyCommitteeDecision({
      decision: 'CONFIRMED',
      farmerIndex: 2,
      farmerId: 'F-C',
      demands: U,
      weights: land,
      pool: 130,
      floor: 0.0,
      R,
      E,
      review,
      currentAlloc: wf130.alloc,
      currentReleased: split130.released,
      currentEscrow: split130.escrow,
    });

    for (let i = 0; i < 4; i++) {
      expect(Math.abs(commRes.alloc[i] - expectedConfirmed.alloc[i])).toBeLessThan(1e-9);
    }
    expect(Math.abs(commRes.unused - expectedConfirmed.unused)).toBeLessThan(1e-9);

    // 5. Edge cases in trustBlend
    for (const [caseName, expectedCase] of Object.entries<any>(golden.edge_cases)) {
      let rInput: number | null = null;
      let eInput: number | null = null;

      if (caseName === 'lambda_binds_R0_E50') {
        rInput = 0.0;
        eInput = 50.0;
      } else if (caseName === 'lambda_binds_R50_E0') {
        rInput = 50.0;
        eInput = 0.0;
      } else if (caseName === 'lambda_equal_not_binding_R20_E50') {
        rInput = 20.0;
        eInput = 50.0;
      } else if (caseName === 'both_zero') {
        rInput = 0.0;
        eInput = 0.0;
      } else if (caseName === 'meter_missing') {
        rInput = 30.0;
        eInput = null;
      } else if (caseName === 'report_missing') {
        rInput = null;
        eInput = 40.0;
      } else if (caseName === 'no_data') {
        rInput = null;
        eInput = null;
      }

      const actualCase = trustBlend(rInput, eInput);

      if (expectedCase.T === null) {
        expect(actualCase.T).toBeNull();
      } else {
        expect(Math.abs(actualCase.T! - expectedCase.T)).toBeLessThan(1e-9);
      }

      if (expectedCase.lam === null) {
        expect(actualCase.lam).toBeNull();
      } else {
        expect(Math.abs(actualCase.lam! - expectedCase.lam)).toBeLessThan(1e-9);
      }

      expect(Math.abs(actualCase.U - expectedCase.U)).toBeLessThan(1e-9);

      if (expectedCase.mismatch === null) {
        expect(actualCase.mismatch).toBeNull();
      } else {
        expect(Math.abs(actualCase.mismatch! - expectedCase.mismatch)).toBeLessThan(1e-9);
      }

      expect(actualCase.flags).toEqual(expectedCase.flags);
    }
  });

  it('reproduces e1_vectors.json with relative error < 1e-9', () => {
    const golden = loadJson('e1_vectors.json');
    for (const vec of golden) {
      const u = vec.u;
      const expectedE1 = vec.E1;
      const actualE1 = e1(u);
      const relError = Math.abs(actualE1 / expectedE1 - 1.0);
      expect(relError).toBeLessThan(1e-9);
    }

    // Cooper-Jacob check: rel error < 0.3% for u <= 0.01
    const cjVal = cooperJacob(0.01);
    const e1At001 = e1(0.01);
    const cjRelError = Math.abs(cjVal / e1At001 - 1.0);
    expect(cjRelError).toBeLessThan(0.003);
  });

  it('reproduces merkle_vectors.json exactly', () => {
    const golden = loadJson('merkle_vectors.json');
    const rows = golden.rows; // [["F-A", "25.103448"], ...]

    const leaves = rows.map((r: [string, string]) =>
      leafSync([r[0], 'zone-a', '2026-W10', r[1]])
    );

    // Leaves match
    for (let i = 0; i < leaves.length; i++) {
      let hex = '';
      for (let j = 0; j < leaves[i].length; j++) {
        hex += leaves[i][j].toString(16).padStart(2, '0');
      }
      expect(hex).toBe(golden.leaves[i]);
    }

    // root4
    const r4 = rootSync(leaves);
    let r4Hex = '';
    for (let j = 0; j < r4.length; j++) {
      r4Hex += r4[j].toString(16).padStart(2, '0');
    }
    expect(r4Hex).toBe(golden.root4);

    // root3 (odd count: promotes 3rd unchanged)
    const r3 = rootSync(leaves.slice(0, 3));
    let r3Hex = '';
    for (let j = 0; j < r3.length; j++) {
      r3Hex += r3[j].toString(16).padStart(2, '0');
    }
    expect(r3Hex).toBe(golden.root3);

    // root1 (single leaf is root)
    const r1 = rootSync(leaves.slice(0, 1));
    let r1Hex = '';
    for (let j = 0; j < r1.length; j++) {
      r1Hex += r1[j].toString(16).padStart(2, '0');
    }
    expect(r1Hex).toBe(golden.root1);

    // Tampered root with F-C + 10 alloc
    const tamperedLeaves = [...leaves];
    tamperedLeaves[2] = leafSync(['F-C', 'zone-a', '2026-W10', '27.931034']);
    const rTamper = rootSync(tamperedLeaves);
    let rTamperHex = '';
    for (let j = 0; j < rTamper.length; j++) {
      rTamperHex += rTamper[j].toString(16).padStart(2, '0');
    }
    expect(rTamperHex).toBe(golden.root4_tampered_FC_plus10);

    // WRONG duplicated odd root3 must match golden negative fixture and differ from actual root3
    const rWrong3 = rootDuplicateOddWrongSync(leaves.slice(0, 3));
    let rWrong3Hex = '';
    for (let j = 0; j < rWrong3.length; j++) {
      rWrong3Hex += rWrong3[j].toString(16).padStart(2, '0');
    }
    expect(rWrong3Hex).toBe(golden.WRONG_duplicate_odd_root3);
    expect(r3Hex).not.toBe(rWrong3Hex);
  });

  it('reproduces impact_vectors.json exactly', () => {
    const golden = loadJson('impact_vectors.json');
    for (const vec of golden) {
      const H = vec.H;
      const eta = vec.eta;
      const k = kwhPerM3(H, eta);
      expect(Math.abs(Number(k) - vec.kwh_per_m3)).toBeLessThan(1e-9);

      const impact = computeImpact(1.0, H, eta);
      expect(Math.abs(impact.kgCo2ePerM3.avg - vec.avg_0_675)).toBeLessThan(1e-9);
      expect(Math.abs(impact.kgCo2ePerM3.cm - vec.cm_0_705)).toBeLessThan(1e-9);
      expect(Math.abs(impact.kgCo2ePerM3.om - vec.om_0_963)).toBeLessThan(1e-9);
    }
  });
});
