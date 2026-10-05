/**
 * §6.6 Theis Well Function and Exponential Integral E1
 */
import { M2PerDay, M3PerDay, Meters, asMeters } from './types.js';

export const EULER_GAMMA = 0.5772156649015329;

/**
 * Exponential integral E1(u) = \int_u^\infty \frac{e^{-t}}{t} dt
 * - Power series for u <= 1.0
 * - Modified Lentz continued fraction for u > 1.0
 * Guaranteed relative error < 1e-9 across all positive domains.
 */
export function e1(u: number): number {
  if (u <= 0) {
    throw new Error('u must be > 0');
  }

  // Power series for u <= 1.0
  if (u <= 1.0) {
    let s = 0.0;
    let term = 1.0;
    for (let k = 1; k < 200; k++) {
      term *= -u / k;
      const step = term / k;
      s += step;
      if (Math.abs(step) < 1e-18) break;
    }
    return -EULER_GAMMA - Math.log(u) - s;
  }

  // Modified Lentz continued fraction for u > 1.0
  const tiny = 1e-300;
  let b = u + 1.0;
  let c = 1.0 / tiny;
  let d = 1.0 / b;
  let h = d;

  for (let i = 1; i < 500; i++) {
    const a = -Number(i * i);
    b += 2.0;
    d = 1.0 / (a * d + b);
    c = b + a / c;
    const de = c * d;
    h *= de;
    if (Math.abs(de - 1.0) < 1e-16) break;
  }

  return h * Math.exp(-u);
}

/**
 * Cooper-Jacob approximation for small u (u <= 0.01)
 * W(u) \approx -gamma - ln(u)
 */
export function cooperJacob(u: number): number {
  if (u <= 0) throw new Error('u must be > 0');
  return -EULER_GAMMA - Math.log(u);
}

/**
 * Theis drawdown s(r, t) in meters
 * s = \frac{Q}{4 \pi T} W(u), where u = \frac{r^2 S}{4 T t}
 *
 * @param Q_m3d Pumping rate in m³/day
 * @param T_m2d Aquifer transmissivity in m²/day
 * @param S Aquifer storativity / storage coefficient (dimensionless)
 * @param r_m Distance from pumping well in meters
 * @param t_d Time elapsed in days
 */
export function theisDrawdown(
  Q_m3d: M3PerDay | number,
  T_m2d: M2PerDay | number,
  S: number,
  r_m: Meters | number,
  t_d: number
): Meters {
  if (r_m <= 0 || t_d <= 0) return asMeters(0.0);
  const u = (r_m * r_m * S) / (4.0 * T_m2d * t_d);
  const w = e1(u);
  const s = (Number(Q_m3d) / (4.0 * Math.PI * Number(T_m2d))) * w;
  return asMeters(s);
}

export interface WellObservation {
  x: number;
  y: number;
  Q_m3d: M3PerDay | number;
}

/**
 * Computes total drawdown at target (x, y) via superposition of multiple wells.
 */
export function theisSuperposition(
  targetX: number,
  targetY: number,
  wells: WellObservation[],
  T_m2d: M2PerDay | number,
  S: number,
  t_d: number
): Meters {
  let totalDrawdown = 0.0;
  for (const well of wells) {
    const dx = targetX - well.x;
    const dy = targetY - well.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > 0 && Number(well.Q_m3d) > 0) {
      totalDrawdown += theisDrawdown(well.Q_m3d, T_m2d, S, r, t_d);
    }
  }
  return asMeters(totalDrawdown);
}
