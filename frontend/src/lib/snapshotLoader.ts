/**
 * Snapshot loader and Tier-0 client-side computation engine using @aquapulse/core.
 * Guarantees that with the API completely blocked, every demo-critical number
 * is computed in the browser by the TS math core.
 */

import {
  trustBlend,
  waterFill,
  escrowSplit,
  leafSync,
  rootSync,
  toHex,
  fmt6,
  TrustBlendResult,
} from '@aquapulse/core';
import { Assumptions } from '../store/useStore';
import { Prov } from './prov';

export interface SnapshotFarmer {
  id: string;
  name: string;
  land: number;
  R: number | null;
  E: number | null;
  Q: number;
  T?: number | null;
  lam?: number | null;
  U?: number | null;
  alloc_104?: number;
  released_104?: number;
  escrow_104?: number;
  alloc_130?: number;
  released_130?: number;
  escrow_130?: number;
  flags: string[];
  coords: [number, number];
}

export interface SnapshotData {
  zone: string;
  district: string;
  state: string;
  week: number;
  asOf: string;
  source: string;
  hash: string;
  B_REF: number;
  pool: number;
  SOE_reports_pct: number;
  SOE_meter_pct: number;
  SOE_verified_pct: number;
  sumU: number;
  tier_reports: string;
  tier_meter: string;
  tier_verified: string;
  farmers: SnapshotFarmer[];
  provenance: Record<string, Prov>;
}

export interface ComputedFarmer extends SnapshotFarmer {
  blend: TrustBlendResult;
  alloc: number;
  released: number;
  escrow: number;
  weight: number;
  floor: number;
}

export interface ComputedDashboardModel {
  zone: string;
  week: number;
  asOf: string;
  source: string;
  hash: string;
  B_REF: number;
  pool: number;
  sumR: number;
  sumE: number;
  sumU: number;
  SOE_reports_pct: number;
  SOE_meter_pct: number;
  SOE_verified_pct: number;
  tier_reports: string;
  tier_meter: string;
  tier_verified: string;
  merkleRoot: string;
  farmers: ComputedFarmer[];
  isClientComputed: boolean;
  provenance: Record<string, Prov>;
}

export function classifyTier(soePct: number): string {
  if (soePct > 100) return 'Over-exploited';
  if (soePct >= 90) return 'Critical';
  if (soePct > 70) return 'Semi-critical';
  return 'Safe';
}

/**
 * Computes all demo-critical numbers client-side using pure TS @aquapulse/core functions.
 */
export function computeTier0(
  snapshot: SnapshotData,
  assumptions: Assumptions,
  verifiedVsReports: boolean
): ComputedDashboardModel {
  const farmers = snapshot.farmers;
  const pool = snapshot.pool;
  const B_REF = snapshot.B_REF;

  // 1. Trust blend per farmer
  const blends: TrustBlendResult[] = farmers.map((f) =>
    trustBlend(f.R, f.E, {
      lambdaMax: assumptions.lambda_max,
      reviewMismatch: assumptions.review_mismatch,
    })
  );

  // Demand vector: if verifiedVsReports toggle is active, demand is reports-only R (for comparison)
  const demands: number[] = farmers.map((f, idx) => {
    if (verifiedVsReports) {
      return f.R ?? 0;
    }
    return blends[idx].U;
  });

  // Weights proportional to land area
  const totalLand = farmers.reduce((acc, f) => acc + f.land, 0);
  const weights = farmers.map((f) => (totalLand > 0 ? f.land / totalLand : 1 / farmers.length));

  // 2. Water filling allocation
  const allocResult = waterFill(demands, weights, pool, assumptions.floor_m3);
  const allocations = allocResult.alloc;

  // 3. Escrow split
  const reports = farmers.map((f) => f.R);
  const meters = farmers.map((f) => f.E);
  const reviews = blends.map((b) => b.flags.includes('REVIEW'));
  const discharges = farmers.map((f) => f.Q || 1.0);

  const escrowResults = escrowSplit(allocations, reports, meters, reviews, discharges);

  // 4. Merkle tree receipt
  const leaves = farmers.map((f, idx) =>
    leafSync([
      f.id,
      snapshot.zone,
      String(snapshot.week),
      fmt6(demands[idx]),
      fmt6(allocations[idx]),
      fmt6(escrowResults.released[idx]),
      fmt6(escrowResults.escrow[idx]),
      blends[idx].flags.join('|'),
    ])
  );
  const treeRoot = toHex(rootSync(leaves));

  // Metrics
  const sumR = farmers.reduce((acc, f) => acc + (f.R ?? 0), 0);
  const sumE = farmers.reduce((acc, f) => acc + (f.E ?? 0), 0);
  const sumU = demands.reduce((acc, d) => acc + d, 0);

  const SOE_reports_pct = (sumR / B_REF) * 100;
  const SOE_meter_pct = (sumE / B_REF) * 100;
  const SOE_verified_pct = (sumU / B_REF) * 100;

  const computedFarmers: ComputedFarmer[] = farmers.map((f, idx) => ({
    ...f,
    blend: blends[idx],
    U: demands[idx],
    T: blends[idx].T,
    lam: blends[idx].lam,
    alloc: allocations[idx],
    released: escrowResults.released[idx],
    escrow: escrowResults.escrow[idx],
    weight: weights[idx],
    floor: assumptions.floor_m3,
    flags: blends[idx].flags,
  }));

  return {
    zone: snapshot.zone,
    week: snapshot.week,
    asOf: snapshot.asOf,
    source: snapshot.source,
    hash: snapshot.hash,
    B_REF,
    pool,
    sumR,
    sumE,
    sumU,
    SOE_reports_pct,
    SOE_meter_pct,
    SOE_verified_pct,
    tier_reports: classifyTier(SOE_reports_pct),
    tier_meter: classifyTier(SOE_meter_pct),
    tier_verified: classifyTier(SOE_verified_pct),
    merkleRoot: treeRoot,
    farmers: computedFarmers,
    isClientComputed: true,
    provenance: {
      ...snapshot.provenance,
      merkleRoot: {
        kind: 'LIVE',
        source: 'TypeScript Merkle Core (client computed)',
        asOf: snapshot.asOf,
        hash: treeRoot,
      },
    },
  };
}

export async function loadSnapshot(): Promise<SnapshotData> {
  const resp = await fetch('/snapshot.json');
  if (!resp.ok) {
    throw new Error(`Failed to load snapshot: status ${resp.status}`);
  }
  return (await resp.json()) as SnapshotData;
}
