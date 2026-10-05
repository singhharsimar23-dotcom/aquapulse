/**
 * @aquapulse/core - Core Types and Units
 * Pure TypeScript, zero runtime dependencies.
 * All units encoded into type names.
 */

// Branded unit types to prevent accidental unit mixing
export type Hours = number & { readonly __unit?: 'hours' };
export type CubicMeters = number & { readonly __unit?: 'm3' };
export type M3PerDay = number & { readonly __unit?: 'm3/day' };
export type M3PerHour = number & { readonly __unit?: 'm3/hour' };
export type M2PerDay = number & { readonly __unit?: 'm2/day' };
export type Meters = number & { readonly __unit?: 'meters' };
export type Acres = number & { readonly __unit?: 'acres' };
export type KilowattHours = number & { readonly __unit?: 'kWh' };
export type Kilowatts = number & { readonly __unit?: 'kW' };
export type Millimeters = number & { readonly __unit?: 'mm' };
export type Dimensionless = number;

export function asHours(n: number): Hours {
  return n as Hours;
}

export function asCubicMeters(n: number): CubicMeters {
  return n as CubicMeters;
}

export function asM3PerDay(n: number): M3PerDay {
  return n as M3PerDay;
}

export function asM2PerDay(n: number): M2PerDay {
  return n as M2PerDay;
}

export function asMeters(n: number): Meters {
  return n as Meters;
}

export function asAcres(n: number): Acres {
  return n as Acres;
}

export function asKWh(n: number): KilowattHours {
  return n as KilowattHours;
}

export function asKW(n: number): Kilowatts {
  return n as Kilowatts;
}

/**
 * Provenance tag for any data value per §A and §8.6.
 */
export type ProvKind = 'LIVE' | 'REPLAY' | 'SYNTH' | 'ASSUMPTION' | 'USER';

export interface Prov {
  kind: ProvKind;
  source: string;
  asOf: string;
  hash?: string;
}

/**
 * Farmer input measurement hours.
 * null means missing / not reported; never coerced to 0.
 */
export interface FarmerHoursInput {
  farmerId: string;
  reportedHours: Hours | null;
  meterHours: Hours | null;
  dischargeM3h?: M3PerHour;
}

/**
 * Output of §6.2 trustBlend
 */
export interface TrustBlendResult {
  T: number | null;
  lam: number | null;
  U: Hours;
  mismatch: number | null;
  flags: string[];
}

/**
 * Output of §6.5 waterFill
 */
export interface WaterFillResult {
  alloc: CubicMeters[];
  floorInfeasible: boolean;
}

/**
 * Output of §6.5 escrowSplit
 */
export interface EscrowSplitResult {
  released: CubicMeters[];
  escrow: CubicMeters[];
}

/**
 * Committee decision types per §6.5
 */
export type CommitteeDecision = 'CONFIRMED' | 'DISMISSED' | 'TIMED_OUT';

export interface CommitteeDecisionResult {
  decision: CommitteeDecision;
  farmerId: string;
  alloc: CubicMeters[];
  released: CubicMeters[];
  escrow: CubicMeters[];
  unused: CubicMeters;
}

/**
 * Aquifer and Cap state per §6.4
 */
export interface AciCapState {
  capM3: CubicMeters;
  poolM3: CubicMeters;
  omegaHat: number;
  alpha: number;
  alphaTarget: number;
  margin: Meters;
  err: number;
  soePct: number;
  tier: 'Safe' | 'Semi-critical' | 'Critical' | 'Over-exploited';
}
