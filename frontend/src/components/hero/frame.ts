/**
 * Pure frame(t, model) implementation per AQUAPULSE_V9_2_LEAN.md §8.4.
 * Completely deterministic mathematical evaluation of all hero scene components
 * without React state or per-frame DOM updates.
 */

import { ComputedDashboardModel, ComputedFarmer } from '../../lib/snapshotLoader';
import { waterFill, escrowSplit, leafSync, rootSync, toHex, fmt6 } from '@aquapulse/core';

export interface ColumnState {
  id: string;
  name: string;
  coords: [number, number];
  ghostHeight: number;       // R * Q
  solidHeight: number;       // Dynamic height based on current beat
  displayValue: number;      // Current numerical value
  rValue: number;            // R
  eValue: number;            // E
  uValue: number;            // U
  allocValue: number;        // Allocated m3
  releasedValue: number;     // Released m3
  escrowValue: number;       // Escrowed m3
  lambda: number | null;     // Trust weight
  hasReview: boolean;        // REVIEW flag active
  isTowering: boolean;       // Farmer C towers in Beat 2
  hasFloorRing: boolean;     // Dignity floor ring active
  hasEscrowHatch: boolean;   // Escrow band active
}

export interface WaterFlowState {
  from: [number, number];
  to: [number, number];
  width: number;             // Proportional to allocation
  intensity: number;         // Flow rate
}

export interface HeroFrame {
  t: number;
  beat: 1 | 2 | 3 | 4 | 5;
  beatTitle: string;
  beatSubtitle: string;
  ring: {
    pct: number;
    tier: string;
  };
  columns: ColumnState[];
  flows: WaterFlowState[];
  satellite: {
    visible: boolean;
    sceneId: string;
    date: string;
    cloudPct: number;
    shellAroundC: boolean;
  };
  allocation: {
    pool: number;
    isScarce: boolean;
    scarcityTruth: string;
  };
  receipt: {
    merkleRoot: string;
    isTampered: boolean;
    tamperedRoot?: string;
  };
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function computeHeroFrame(
  rawT: number,
  model: ComputedDashboardModel,
  options?: {
    poolOverride?: number;
    isTampered?: boolean;
    floorOverride?: number;
  }
): HeroFrame {
  // Clamp time between 0 and 35 seconds
  const t = Math.max(0, Math.min(35, rawT));

  let beat: 1 | 2 | 3 | 4 | 5 = 1;
  let beatTitle = '';
  let beatSubtitle = '';

  if (t < 6) {
    beat = 1;
    beatTitle = 'What they said';
    beatSubtitle = 'Self-reported pumping claims from four farmers; initial stress gauge at 89.2% (Semi-critical).';
  } else if (t < 12) {
    beat = 2;
    beatTitle = 'What grid and sky saw';
    beatSubtitle = 'Electricity feeder meters & Sentinel-2 satellite crop greenness corroborate actual pumping.';
  } else if (t < 19) {
    beat = 3;
    beatTitle = 'Verify';
    beatSubtitle = 'Bayesian trust blending bounds misreporting (λ_C = 0.6); stress rises to 103.0% (Over-exploited).';
  } else if (t < 28) {
    beat = 4;
    beatTitle = 'Allocate';
    beatSubtitle = 'Water-filling with dignity floor protects domestic safety; disputed water is held in escrow.';
  } else {
    beat = 5;
    beatTitle = 'Receipt & Tamper Proof';
    beatSubtitle = 'Tamper-evident Merkle ledger commits allocations; any single-bit manipulation fails proof.';
  }

  // 1. Ring calculation
  let ringPct = model.SOE_reports_pct; // 89.23%
  let ringTier = model.tier_reports;   // 'Semi-critical'

  if (beat === 1) {
    ringPct = model.SOE_reports_pct;
    ringTier = model.tier_reports;
  } else if (beat === 2) {
    // Slight ease towards meter observation if desired, or stable reports baseline
    const progress = (t - 6) / 6;
    ringPct = model.SOE_reports_pct;
    ringTier = model.tier_reports;
  } else if (beat === 3) {
    // Beat 3: eases smoothly from 89.2% to 103.0%
    const progress = Math.min(1, Math.max(0, (t - 12) / 7));
    const ease = easeInOutCubic(progress);
    ringPct = model.SOE_reports_pct + (model.SOE_verified_pct - model.SOE_reports_pct) * ease;
    ringTier = ringPct > 100.0 ? model.tier_verified : model.tier_reports;
  } else {
    ringPct = model.SOE_verified_pct;
    ringTier = model.tier_verified;
  }

  // 2. Pool & Allocation (Beat 4 & 5)
  const pool = options?.poolOverride ?? model.pool; // Default 130
  const floor = options?.floorOverride ?? 0.0;

  // Recompute allocation dynamically if pool changed
  const demands = model.farmers.map((f) => f.U ?? f.blend.U);
  const totalLand = model.farmers.reduce((sum, f) => sum + f.land, 0);
  const weights = model.farmers.map((f) => (totalLand > 0 ? f.land / totalLand : 0.25));

  const dynamicAlloc = waterFill(demands, weights, pool, floor);
  const reports = model.farmers.map((f) => f.R);
  const meters = model.farmers.map((f) => f.E);
  const reviews = model.farmers.map((f) => f.blend.flags.includes('REVIEW'));
  const discharges = model.farmers.map((f) => f.Q || 1.0);
  const dynamicEscrow = escrowSplit(dynamicAlloc.alloc, reports, meters, reviews, discharges);

  // Farmer C escrow at pool 104 vs 130
  const cIndex = model.farmers.findIndex((f) => f.id === 'C');
  const cEscrow = cIndex >= 0 ? dynamicEscrow.escrow[cIndex] : 0;
  const isScarce = cEscrow <= 0.01;
  const scarcityTruth = isScarce
    ? 'Water is scarce (pool ≤ 104 m³) — land share binds, nothing to hold (alloc_C ≤ min(R,E))'
    : `Water available (pool = ${pool.toFixed(0)} m³) — ${cEscrow.toFixed(1)} m³ held in escrow for Farmer C`;

  // 3. Columns state per farmer
  const columns: ColumnState[] = model.farmers.map((f, idx) => {
    const rVal = f.R ?? 0;
    const eVal = f.E ?? 0;
    const uVal = f.U ?? f.blend.U;
    const ghostH = rVal * f.Q;
    const isC = f.id === 'C';

    let solidH = 0;
    let dispVal = 0;

    if (beat === 1) {
      // Beat 1: ghost column only, solid column 0
      solidH = 0;
      dispVal = rVal;
    } else if (beat === 2) {
      // Beat 2: solid column rises to E
      const p = Math.min(1, Math.max(0, (t - 6) / 4));
      const ease = easeInOutCubic(p);
      solidH = eVal * f.Q * ease;
      dispVal = eVal * ease;
    } else if (beat === 3) {
      // Beat 3: eases from E to U
      const p = Math.min(1, Math.max(0, (t - 12) / 6));
      const ease = easeInOutCubic(p);
      solidH = (eVal + (uVal - eVal) * ease) * f.Q;
      dispVal = eVal + (uVal - eVal) * ease;
    } else {
      // Beat 4 & 5: shows allocation
      solidH = dynamicAlloc.alloc[idx];
      dispVal = dynamicAlloc.alloc[idx];
    }

    return {
      id: f.id,
      name: f.name,
      coords: f.coords,
      ghostHeight: ghostH,
      solidHeight: solidH,
      displayValue: dispVal,
      rValue: rVal,
      eValue: eVal,
      uValue: uVal,
      allocValue: dynamicAlloc.alloc[idx],
      releasedValue: dynamicEscrow.released[idx],
      escrowValue: dynamicEscrow.escrow[idx],
      lambda: f.blend.lam,
      hasReview: f.blend.flags.includes('REVIEW'),
      isTowering: isC && beat === 2,
      hasFloorRing: beat >= 4,
      hasEscrowHatch: isC && beat >= 4 && dynamicEscrow.escrow[idx] > 0.05,
    };
  });

  // 4. Water flows from aquifer well center to plots (Beat 4 & 5)
  const wellCenter: [number, number] = [78.6022, 20.7453];
  const flows: WaterFlowState[] = model.farmers.map((f, idx) => ({
    from: wellCenter,
    to: f.coords,
    width: beat >= 4 ? Math.max(1, dynamicAlloc.alloc[idx] / 10) : 0,
    intensity: beat >= 4 ? 1.0 : 0,
  }));

  // 5. Merkle Root and Tamper Demo (Beat 5)
  const isTampered = options?.isTampered ?? false;
  let tamperedRoot: string | undefined = undefined;

  if (isTampered) {
    // Generate tampered receipt with +10 m3 to Farmer C
    const tamperedLeaves = model.farmers.map((f, idx) => {
      const isTamperedFarmer = f.id === 'C';
      const demandVal = isTamperedFarmer ? demands[idx] + 10 : demands[idx];
      const allocVal = dynamicAlloc.alloc[idx];
      const relVal = dynamicEscrow.released[idx];
      const escVal = dynamicEscrow.escrow[idx];
      return leafSync([
        f.id,
        model.zone,
        String(model.week),
        fmt6(demandVal),
        fmt6(allocVal),
        fmt6(relVal),
        fmt6(escVal),
        f.blend.flags.join('|'),
      ]);
    });
    tamperedRoot = toHex(rootSync(tamperedLeaves));
  }

  return {
    t,
    beat,
    beatTitle,
    beatSubtitle,
    ring: {
      pct: ringPct,
      tier: ringTier,
    },
    columns,
    flows,
    satellite: {
      visible: beat === 2 || beat === 3,
      sceneId: 'S2A_MSIL2A_20261004T054651_N0511_R062_T43QEG_20261004T085422',
      date: '2026-10-04',
      cloudPct: 0.8,
      shellAroundC: beat === 2 || beat === 3,
    },
    allocation: {
      pool,
      isScarce,
      scarcityTruth,
    },
    receipt: {
      merkleRoot: model.merkleRoot,
      isTampered,
      tamperedRoot,
    },
  };
}
