/**
 * §6.2 Dual-signal trust + missing data handling
 */
import { Hours, TrustBlendResult, asHours } from './types.js';

export const DEFAULT_LAMBDA_MAX = 0.6; // ASSUMPTION: cap on meter override
export const DEFAULT_REVIEW_MISMATCH = 0.5; // ASSUMPTION: mismatch threshold -> REVIEW

export interface TrustBlendOptions {
  lambdaMax?: number;
  reviewMismatch?: number;
  feederHours?: Hours;
}

/**
 * Computes trust T, blend weight lambda, and blended hours U.
 * Handles missing data cleanly without coercing null to 0:
 * - R=null, E=null: U=0, flags: ["NO_DATA"]
 * - E=null: U=R, flags: ["NO_METER"]
 * - R=null: U=E, flags: ["NO_REPORT"]
 *
 * @param R Reported pumping hours (or null if missing)
 * @param E Metered pumping hours (or null if missing)
 * @param options Optional overrides for constants
 */
export function trustBlend(
  R: Hours | null,
  E: Hours | null,
  options?: TrustBlendOptions
): TrustBlendResult {
  const lamMax = options?.lambdaMax ?? DEFAULT_LAMBDA_MAX;
  const reviewMismatch = options?.reviewMismatch ?? DEFAULT_REVIEW_MISMATCH;
  const flags: string[] = [];

  // Missing data cases
  if (R === null && E === null) {
    return {
      T: null,
      lam: null,
      U: asHours(0.0),
      mismatch: null,
      flags: ['NO_DATA'],
    };
  }

  if (E === null) {
    const res: TrustBlendResult = {
      T: null,
      lam: null,
      U: asHours(Number(R)),
      mismatch: null,
      flags: ['NO_METER'],
    };
    if (options?.feederHours !== undefined && R !== null && R > options.feederHours) {
      res.flags.push('IMPOSSIBLE_HOURS');
    }
    return res;
  }

  if (R === null) {
    return {
      T: null,
      lam: null,
      U: asHours(Number(E)),
      mismatch: null,
      flags: ['NO_REPORT'],
    };
  }

  const rVal = Number(R);
  const eVal = Number(E);
  const m = Math.max(rVal, eVal);

  const T = m === 0 ? 1.0 : Math.min(1.0, Math.max(0.0, 1.0 - Math.abs(rVal - eVal) / m));
  const mismatch = m === 0 ? 0.0 : Math.abs(rVal - eVal) / m;
  const lam = Math.min(lamMax, 1.0 - T);
  const U = (1.0 - lam) * rVal + lam * eVal;

  if (mismatch > reviewMismatch) {
    flags.push('REVIEW');
  }

  if (options?.feederHours !== undefined && rVal > options.feederHours) {
    flags.push('IMPOSSIBLE_HOURS');
  }

  return {
    T,
    lam,
    U: asHours(U),
    mismatch,
    flags,
  };
}
