/**
 * §6.5 Weighted max-min water-filling with floor
 */
import { CubicMeters, WaterFillResult, asCubicMeters } from './types.js';

/**
 * Performs weighted max-min water-filling allocation across farmers.
 *
 * @param demands Demands d_i in m³
 * @param weights Weights w_i (e.g. land acres L_i)
 * @param pool Available water pool P in m³
 * @param floor Minimum dignity floor f in m³/week (default 0.0)
 * @returns { alloc: CubicMeters[], floorInfeasible: boolean }
 */
export function waterFill(
  demands: number[],
  weights: number[],
  pool: number,
  floor: number = 0.0
): WaterFillResult {
  const n = demands.length;
  if (n === 0) {
    return { alloc: [], floorInfeasible: false };
  }

  const fi: number[] = demands.map((d) => Math.min(floor, d));
  const sumFi = fi.reduce((acc, v) => acc + v, 0);

  // If floors alone exceed the pool: scale floors proportionally, raise FLOOR_INFEASIBLE
  if (sumFi > pool) {
    const alloc = fi.map((fVal) => asCubicMeters((pool * fVal) / sumFi));
    return { alloc, floorInfeasible: true };
  }

  const P2 = pool - sumFi;
  const d2: number[] = demands.map((d, i) => d - fi[i]);
  const sumD2 = d2.reduce((acc, v) => acc + v, 0);

  // If remaining demand is within remaining pool, everyone gets full demand
  if (sumD2 <= P2) {
    const alloc = demands.map((_, i) => asCubicMeters(fi[i] + d2[i]));
    return { alloc, floorInfeasible: false };
  }

  // Bisection search for theta: sum(min(d2[i], theta * w[i])) == P2
  let maxRatio = 0.0;
  for (let i = 0; i < n; i++) {
    if (weights[i] > 0) {
      const r = d2[i] / weights[i];
      if (r > maxRatio) maxRatio = r;
    }
  }

  let lo = 0.0;
  let hi = maxRatio;

  for (let iter = 0; iter < 300; iter++) {
    const th = (lo + hi) / 2.0;
    let sumAlloc = 0.0;
    for (let i = 0; i < n; i++) {
      sumAlloc += Math.min(d2[i], th * weights[i]);
    }
    if (sumAlloc > P2) {
      hi = th;
    } else {
      lo = th;
    }
  }

  const alloc = demands.map((_, i) => asCubicMeters(fi[i] + Math.min(d2[i], lo * weights[i])));
  return { alloc, floorInfeasible: false };
}
