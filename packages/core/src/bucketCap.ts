/**
 * §6.4 Aquifer Cap: Bucket Model + ACI + Overdraw Correction
 */
import { AciCapState, CubicMeters, Meters, asCubicMeters, asMeters } from './types.js';

export const DEFAULT_GAMMA = 0.02;
export const DEFAULT_ALPHA_TARGET = 0.10;
export const DEFAULT_EMA_THETA = 0.30;
export const DEFAULT_WINDOW = 52;

/**
 * Computes weekly recharge Rch_t in m³/week.
 * Rch_t = \epsilon \cdot \text{rain}_t \cdot A_z / 1000
 */
export function computeRecharge(rainMm: number, AzM2: number, epsilon: number): CubicMeters {
  return asCubicMeters((epsilon * rainMm * AzM2) / 1000.0);
}

/**
 * Predicts head level \hat{h}_{t+1} (m above safe floor).
 * \hat{h}_{t+1} = h_t + (Rch_t - Ext) / (S_y \cdot A_z)
 */
export function predictLevel(
  hCurrent: Meters | number,
  rechargeM3: CubicMeters | number,
  extractionM3: CubicMeters | number,
  SyAz: number
): Meters {
  return asMeters(Number(hCurrent) + (Number(rechargeM3) - Number(extractionM3)) / SyAz);
}

/**
 * Prediction error e_t = \hat{h}_t - h_t^{obs} (> 0 means level fell more than predicted).
 */
export function computeError(hPredicted: Meters | number, hObserved: Meters | number): number {
  return Number(hPredicted) - Number(hObserved);
}

/**
 * Conformal margin m_t: (1 - alpha) quantile of positive errors over window W (52 weeks).
 */
export function computeMargin(errorsWindow: number[], alpha: number): Meters {
  const q = Math.min(1.0, Math.max(0.0, 1.0 - alpha));
  const pos = errorsWindow.map((x) => Math.max(x, 0.0)).sort((a, b) => a - b);
  if (pos.length < 8) {
    return asMeters(1.0);
  }
  const idx = Math.min(pos.length - 1, Math.round(q * (pos.length - 1)));
  return asMeters(pos[idx]);
}

/**
 * Computes safe extraction cap:
 * Cap_t = \max(0, Rch_t + S_y \cdot A_z \cdot (h_t - m_t))
 */
export function computeCap(
  rechargeM3: CubicMeters | number,
  SyAz: number,
  hCurrent: Meters | number,
  marginM: Meters | number
): CubicMeters {
  const cap = Math.max(0.0, Number(rechargeM3) + SyAz * (Number(hCurrent) - Number(marginM)));
  return asCubicMeters(cap);
}

/**
 * Updates overdraw EMA \hat{\omega}_t:
 * \hat{\omega}_t = (1 - \theta) \hat{\omega}_{t-1} + \theta \max(0, Ext^{ver}_{t-1} / Pool_{t-1} - 1)
 */
export function updateOmegaHat(
  prevOmegaHat: number,
  verifiedExtraction: number,
  prevPool: number,
  theta: number = DEFAULT_EMA_THETA
): number {
  if (prevPool <= 0) return prevOmegaHat;
  const overdrawRatio = Math.max(0.0, verifiedExtraction / prevPool - 1.0);
  return (1.0 - theta) * prevOmegaHat + theta * overdrawRatio;
}

/**
 * Computes published pool:
 * Pool_t = \min(\text{Cap}_t / (1 + \hat{\omega}_t), B_{\text{REF}})
 */
export function computePool(
  capM3: CubicMeters | number,
  omegaHat: number,
  bRef: CubicMeters | number
): CubicMeters {
  const pool = Math.min(Number(capM3) / (1.0 + Math.max(0.0, omegaHat)), Number(bRef));
  return asCubicMeters(pool);
}

/**
 * ACI update step:
 * err_t = 1 if e_t > m_t else 0
 * \alpha_{t+1} = \alpha_t + \gamma (\alpha_{\text{target}} - err_t)
 */
export function aciStep(
  alpha: number,
  error: number,
  margin: Meters | number,
  gamma: number = DEFAULT_GAMMA,
  alphaTarget: number = DEFAULT_ALPHA_TARGET
): { alphaNext: number; err: number } {
  const err = error > Number(margin) ? 1 : 0;
  const alphaNext = alpha + gamma * (alphaTarget - err);
  return { alphaNext, err };
}

export type SoeTier = 'Safe' | 'Semi-critical' | 'Critical' | 'Over-exploited';

/**
 * Stage of Extraction (SOE) per §6.4:
 * SOE = (\sum V_i / B_{\text{REF}}) \cdot 100\%
 * Safe <= 70% | Semi-critical (70, 90]% | Critical (90, 100]% | Over-exploited > 100%
 */
export function computeSoe(
  totalDemandM3: number,
  bRef: number
): { soePct: number; tier: SoeTier } {
  if (bRef <= 0) return { soePct: 0.0, tier: 'Safe' };
  const soePct = (totalDemandM3 / bRef) * 100.0;
  let tier: SoeTier = 'Safe';
  if (soePct > 100.0) {
    tier = 'Over-exploited';
  } else if (soePct > 90.0) {
    tier = 'Critical';
  } else if (soePct > 70.0) {
    tier = 'Semi-critical';
  }
  return { soePct, tier };
}
