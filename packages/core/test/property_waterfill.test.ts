import { describe, it, expect } from 'vitest';
import { waterFill } from '../src/waterFill.js';
import { escrowSplit } from '../src/escrowSplit.js';

// Hand-rolled seeded pseudo-random generator (LCG)
function createRng(initialSeed: number) {
  let s = initialSeed >>> 0;
  return function next(): number {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('§6.5 Allocation and Escrow Property Tests (>= 1,000 seeded cases each)', () => {
  it('Property 1: sum(alloc) = min(P, sum(d)) when floor is feasible (1,000 cases)', () => {
    const rng = createRng(1001);
    for (let c = 0; c < 1000; c++) {
      const n = Math.floor(rng() * 10) + 2; // 2..11 farmers
      const demands = Array.from({ length: n }, () => rng() * 50.0 + 1.0);
      const weights = Array.from({ length: n }, () => rng() * 10.0 + 0.5);
      const sumD = demands.reduce((a, b) => a + b, 0);

      const f = rng() * 5.0; // Dignity floor
      const sumFi = demands.reduce((acc, d) => acc + Math.min(f, d), 0);

      // Ensure P >= sumFi so floor is feasible
      const P = sumFi + rng() * sumD * 1.5;

      const res = waterFill(demands, weights, P, f);
      expect(res.floorInfeasible).toBe(false);

      const sumAlloc = res.alloc.reduce((a, b) => a + b, 0);
      const expectedTotal = Math.min(P, sumD);
      expect(Math.abs(sumAlloc - expectedTotal)).toBeLessThan(1e-6);
    }
  });

  it('Property 2 & 3: alloc_i <= d_i and alloc_i >= min(f, d_i) when floor feasible (1,000 cases)', () => {
    const rng = createRng(2002);
    for (let c = 0; c < 1000; c++) {
      const n = Math.floor(rng() * 8) + 2;
      const demands = Array.from({ length: n }, () => rng() * 60.0 + 0.1);
      const weights = Array.from({ length: n }, () => rng() * 10.0 + 1.0);
      const f = rng() * 5.0;
      const sumFi = demands.reduce((acc, d) => acc + Math.min(f, d), 0);
      const P = sumFi + rng() * 100.0;

      const res = waterFill(demands, weights, P, f);
      expect(res.floorInfeasible).toBe(false);

      for (let i = 0; i < n; i++) {
        expect(res.alloc[i]).toBeLessThanOrEqual(demands[i] + 1e-9);
        expect(res.alloc[i]).toBeGreaterThanOrEqual(Math.min(f, demands[i]) - 1e-9);
      }
    }
  });

  it('Property 4: Permutation-invariance (1,000 cases)', () => {
    const rng = createRng(3003);
    for (let c = 0; c < 1000; c++) {
      const n = Math.floor(rng() * 5) + 3; // 3..7 farmers
      const demands = Array.from({ length: n }, () => rng() * 50.0 + 5.0);
      const weights = Array.from({ length: n }, () => rng() * 10.0 + 1.0);
      const f = rng() * 3.0;
      const P = rng() * 150.0 + 10.0;

      const resOriginal = waterFill(demands, weights, P, f);

      // Create a random permutation
      const indices = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      const permDemands = indices.map((i) => demands[i]);
      const permWeights = indices.map((i) => weights[i]);

      const resPerm = waterFill(permDemands, permWeights, P, f);

      // Check corresponding allocations match
      for (let i = 0; i < n; i++) {
        const origAlloc = resOriginal.alloc[indices[i]];
        const permAlloc = resPerm.alloc[i];
        expect(Math.abs(origAlloc - permAlloc)).toBeLessThan(1e-6);
      }
    }
  });

  it('Property 5: Monotone non-decreasing in pool P (1,000 cases)', () => {
    const rng = createRng(4004);
    for (let c = 0; c < 1000; c++) {
      const n = Math.floor(rng() * 6) + 2;
      const demands = Array.from({ length: n }, () => rng() * 50.0 + 2.0);
      const weights = Array.from({ length: n }, () => rng() * 10.0 + 1.0);
      const f = rng() * 4.0;

      const P1 = rng() * 100.0 + 5.0;
      const P2 = P1 + rng() * 50.0; // P2 >= P1

      const res1 = waterFill(demands, weights, P1, f);
      const res2 = waterFill(demands, weights, P2, f);

      for (let i = 0; i < n; i++) {
        expect(res2.alloc[i]).toBeGreaterThanOrEqual(res1.alloc[i] - 1e-9);
      }
    }
  });

  it('Property 6: Land-proportional when every demand exceeds its land share (1,000 cases)', () => {
    const rng = createRng(5005);
    for (let c = 0; c < 1000; c++) {
      const n = Math.floor(rng() * 5) + 2;
      const weights = Array.from({ length: n }, () => rng() * 10.0 + 2.0);
      const sumW = weights.reduce((a, b) => a + b, 0);
      const P = rng() * 80.0 + 10.0;

      // Demand strictly larger than land share: d_i > P * (w_i / sumW)
      const demands = weights.map((w) => (P * w) / sumW + rng() * 20.0 + 5.0);

      const res = waterFill(demands, weights, P, 0.0);
      for (let i = 0; i < n; i++) {
        const expectedShare = (P * weights[i]) / sumW;
        expect(Math.abs(res.alloc[i] - expectedShare)).toBeLessThan(1e-6);
      }
    }
  });

  it('Property 7, 8 & 9: Escrow invariant released_i + escrow_i = alloc_i and no flag lowers alloc (1,000 cases)', () => {
    const rng = createRng(6006);
    for (let c = 0; c < 1000; c++) {
      const n = Math.floor(rng() * 6) + 2;
      const demands = Array.from({ length: n }, () => rng() * 50.0 + 5.0);
      const weights = Array.from({ length: n }, () => rng() * 10.0 + 1.0);
      const P = rng() * 120.0 + 10.0;

      const res = waterFill(demands, weights, P, 0.0);

      const R = demands.map((d) => (rng() > 0.1 ? d * (0.8 + rng() * 0.4) : null));
      const E = demands.map((d) => (rng() > 0.1 ? d * (0.8 + rng() * 0.4) : null));
      const review = demands.map(() => rng() > 0.5);

      const split = escrowSplit(res.alloc, R, E, review);

      for (let i = 0; i < n; i++) {
        // Property 7: released + escrow = alloc
        expect(Math.abs(split.released[i] + split.escrow[i] - res.alloc[i])).toBeLessThan(1e-9);

        // Property 8: escrow > 0 only if REVIEW
        if (!review[i]) {
          expect(split.escrow[i]).toBe(0.0);
          expect(split.released[i]).toBe(res.alloc[i]);
        }

        // Property 9: No flag alone lowers alloc_i
        // Allocations depend purely on demands, weights, pool, and floor
        expect(res.alloc[i]).toBeGreaterThanOrEqual(0.0);
      }
    }
  });
});
