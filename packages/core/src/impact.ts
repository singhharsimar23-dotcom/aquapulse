/**
 * §6.7 Impact Meter (SYNTH counterfactual)
 * Energy consumption and carbon emissions for groundwater extraction.
 */
import { KilowattHours, Meters, asKWh } from './types.js';

export const DENSITY_WATER = 1000.0; // kg/m³
export const GRAVITY = 9.81; // m/s²
export const JOULES_PER_KWH = 3.6e6;
export const DEFAULT_PUMP_EFFICIENCY = 0.30; // ASSUMPTION (editable)

// CEA CO2 emission factors in kgCO2e / kWh (or tCO2 / MWh)
export const EF_AVG = 0.675; // Average grid emission factor
export const EF_CM = 0.705;  // Combined Margin (default avoided)
export const EF_OM = 0.963;  // Operating Margin (upper bound)
export const EF_BM = 0.446;  // Build Margin

/**
 * Computes energy required per cubic meter extracted (kWh/m³).
 * Formula: \frac{\rho \cdot g \cdot H}{3.6 \times 10^6 \cdot \eta}
 *
 * @param H_m Dynamic lift / head in meters (static lift + Theis drawdown)
 * @param eta Pump efficiency (default 0.30)
 */
export function kwhPerM3(
  H_m: Meters | number,
  eta: number = DEFAULT_PUMP_EFFICIENCY
): KilowattHours {
  if (eta <= 0) throw new Error('Efficiency eta must be > 0');
  const kwh = (DENSITY_WATER * GRAVITY * Number(H_m)) / (JOULES_PER_KWH * eta);
  return asKWh(kwh);
}

export interface ImpactMetrics {
  kwhPerM3: KilowattHours;
  kgCo2ePerM3: {
    avg: number;
    cm: number;
    om: number;
    bm: number;
  };
  totalKWh: KilowattHours;
  totalKgCo2e: {
    avg: number;
    cm: number;
    om: number;
    bm: number;
  };
}

/**
 * Computes full impact metrics for a given volume and head.
 */
export function computeImpact(
  volumeM3: number,
  H_m: Meters | number,
  eta: number = DEFAULT_PUMP_EFFICIENCY
): ImpactMetrics {
  const k = kwhPerM3(H_m, eta);
  const kVal = Number(k);

  const kgCo2ePerM3 = {
    avg: kVal * EF_AVG,
    cm: kVal * EF_CM,
    om: kVal * EF_OM,
    bm: kVal * EF_BM,
  };

  const totalKWh = asKWh(kVal * volumeM3);
  const totalKgCo2e = {
    avg: kgCo2ePerM3.avg * volumeM3,
    cm: kgCo2ePerM3.cm * volumeM3,
    om: kgCo2ePerM3.om * volumeM3,
    bm: kgCo2ePerM3.bm * volumeM3,
  };

  return {
    kwhPerM3: k,
    kgCo2ePerM3,
    totalKWh,
    totalKgCo2e,
  };
}
