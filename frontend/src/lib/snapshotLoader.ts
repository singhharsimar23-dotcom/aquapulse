/**
 * Snapshot loader and Tier-0 client-side computation engine using @aquapulse/core.
 * Guarantees that with the API completely blocked, every demo-critical number
 * is computed in the browser by the TS math core.
 */

import {
  trustBlend,
  waterFill,
  escrowSplit,
  applyCommitteeDecision,
  leafSync,
  rootSync,
  toHex,
  fmt6,
  TrustBlendResult,
  CsvFarmerRow,
} from '@aquapulse/core';
import { Assumptions, FarmerOverride } from '../store/useStore';
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
  U: number;
  T: number;
  lam: number;
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
  unusedPool?: number;
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
  verifiedVsReports: boolean,
  farmerOverrides?: Record<string, FarmerOverride>,
  uploadedCsvRows?: CsvFarmerRow[] | null,
  uploadedCsvHash?: string | null,
  committeeDecisions?: Record<string, 'CONFIRMED' | 'DISMISSED'>,
  poolOverride?: number | null
): ComputedDashboardModel {
  let farmers: SnapshotFarmer[];
  let provKind: 'LIVE' | 'REPLAY' | 'SYNTH' | 'USER' = 'LIVE';
  let provSource = snapshot.source;
  let provHash = snapshot.hash;

  if (uploadedCsvRows && uploadedCsvRows.length > 0) {
    provKind = 'USER';
    provSource = 'Bring-your-own CSV file §8.11';
    provHash = uploadedCsvHash || snapshot.hash;
    farmers = uploadedCsvRows.map((r, i) => ({
      id: r.farmerId,
      name: `Farmer ${r.farmerId}`,
      land: Number(r.landAcres),
      R: r.reportedHours,
      E: r.meterHours,
      Q: Number(r.wellDischargeM3h),
      flags: [],
      coords: [78.6 + i * 0.02, 20.7 + i * 0.02] as [number, number],
    }));
  } else {
    farmers = snapshot.farmers.map((f) => {
      const ov =
        farmerOverrides?.[f.id] ||
        farmerOverrides?.[`F-${f.id}`] ||
        farmerOverrides?.[f.id.replace('F-', '')];
      return {
        ...f,
        R: ov && 'R' in ov ? (ov.R ?? null) : f.R,
        E: ov && 'E' in ov ? (ov.E ?? null) : f.E,
        land: ov && 'land' in ov && ov.land !== undefined ? ov.land : f.land,
        Q: ov && 'Q' in ov && ov.Q !== undefined ? ov.Q : f.Q,
      };
    });
  }

  const pool = poolOverride ?? snapshot.pool;
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
  let finalAlloc = [...allocResult.alloc];

  // 3. Escrow split
  const reports = farmers.map((f) => f.R);
  const meters = farmers.map((f) => f.E);
  const reviews = blends.map((b) => b.flags.includes('REVIEW'));
  const discharges = farmers.map((f) => f.Q || 1.0);

  const escrowResults = escrowSplit(finalAlloc, reports, meters, reviews, discharges);
  let finalReleased = [...escrowResults.released];
  let finalEscrow = [...escrowResults.escrow];
  let unusedPool = 0.0;

  // 4. Committee decisions (§6.5)
  if (committeeDecisions && Object.keys(committeeDecisions).length > 0) {
    farmers.forEach((f, idx) => {
      const dec =
        committeeDecisions[f.id] ||
        committeeDecisions[`F-${f.id}`] ||
        committeeDecisions[f.id.replace('F-', '')];
      if (dec) {
        const commRes = applyCommitteeDecision({

          decision: dec,
          farmerIndex: idx,
          farmerId: f.id,
          demands,
          weights,
          pool,
          floor: assumptions.floor_m3,
          R: reports,
          E: meters,
          review: reviews,
          currentAlloc: finalAlloc,
          currentReleased: finalReleased,
          currentEscrow: finalEscrow,
          Q: discharges,
        });
        finalAlloc = commRes.alloc.map(Number);
        finalReleased = commRes.released.map(Number);
        finalEscrow = commRes.escrow.map(Number);
        unusedPool = Number(commRes.unused);

        if (dec === 'CONFIRMED') {
          blends[idx] = {
            ...blends[idx],
            flags: blends[idx].flags.filter((fl) => fl !== 'REVIEW'),
          };
        }
      }
    });
  }

  // 5. Merkle tree receipt
  const leaves = farmers.map((f, idx) =>
    leafSync([
      f.id,
      snapshot.zone,
      String(snapshot.week),
      fmt6(demands[idx]),
      fmt6(finalAlloc[idx]),
      fmt6(finalReleased[idx]),
      fmt6(finalEscrow[idx]),
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
    T: blends[idx].T ?? 0,
    lam: blends[idx].lam ?? 0,
    alloc: finalAlloc[idx],
    released: finalReleased[idx],
    escrow: finalEscrow[idx],
    weight: weights[idx],
    floor: assumptions.floor_m3,
    flags: blends[idx].flags,
  }));

  return {
    zone: snapshot.zone,
    week: snapshot.week,
    asOf: snapshot.asOf,
    source: provSource,
    hash: provHash,
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
    unusedPool,
    isClientComputed: true,
    provenance: {
      ...snapshot.provenance,
      merkleRoot: {
        kind: provKind,
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
