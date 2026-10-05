/**
 * §6.5 Committee Decision Application
 */
import {
  CommitteeDecision,
  CommitteeDecisionResult,
  CubicMeters,
  Hours,
  asCubicMeters,
} from './types.js';
import { waterFill } from './waterFill.js';
import { escrowSplit } from './escrowSplit.js';

export interface ApplyCommitteeDecisionParams {
  decision: CommitteeDecision;
  farmerIndex: number;
  farmerId: string;
  demands: number[];
  weights: number[];
  pool: number;
  floor?: number;
  R: (Hours | number | null)[];
  E: (Hours | number | null)[];
  review: boolean[];
  currentAlloc: number[];
  currentReleased: number[];
  currentEscrow: number[];
  Q?: number[];
}

/**
 * Applies a committee decision to a disputed allocation.
 *
 * - DISMISSED: Escrow released directly to the farmer.
 * - TIMED_OUT: Escrow released (fail-open).
 * - CONFIRMED: Farmer's demand clamped to u_i = min(R_i, E_i) * Q_i.
 *              The week is re-run with waterFill, redistributing water
 *              via the same rules, and returning any unused pool water.
 */
export function applyCommitteeDecision(
  params: ApplyCommitteeDecisionParams
): CommitteeDecisionResult {
  const {
    decision,
    farmerIndex,
    farmerId,
    demands,
    weights,
    pool,
    floor = 0.0,
    R,
    E,
    review,
    currentAlloc,
    currentReleased,
    currentEscrow,
    Q,
  } = params;

  if (decision === 'DISMISSED' || decision === 'TIMED_OUT') {
    const alloc = [...currentAlloc].map(asCubicMeters);
    const released = [...currentReleased].map(asCubicMeters);
    const escrow = [...currentEscrow].map(asCubicMeters);

    // Release escrow for this farmer
    released[farmerIndex] = alloc[farmerIndex];
    escrow[farmerIndex] = asCubicMeters(0.0);

    const sumAlloc = alloc.reduce((a, b) => a + Number(b), 0);
    const unused = asCubicMeters(Math.max(0.0, pool - sumAlloc));

    return {
      decision,
      farmerId,
      alloc,
      released,
      escrow,
      unused,
    };
  }

  // CONFIRMED:
  // Demand clamped to u_i = min(R_i, E_i) * Q_i
  const r = R[farmerIndex];
  const e = E[farmerIndex];
  const q = Q?.[farmerIndex] ?? 1.0;
  const u = (r !== null && e !== null ? Math.min(Number(r), Number(e)) : Number(demands[farmerIndex])) * q;

  const revisedDemands = [...demands];
  revisedDemands[farmerIndex] = u;

  // Re-run waterFill
  const wfResult = waterFill(revisedDemands, weights, pool, floor);
  const revisedReview = [...review];
  revisedReview[farmerIndex] = false; // Resolved

  // Recalculate escrow with new allocations
  const split = escrowSplit(wfResult.alloc, R, E, revisedReview, Q);

  const sumAlloc = wfResult.alloc.reduce((a, b) => a + Number(b), 0);
  const unused = asCubicMeters(Math.max(0.0, pool - sumAlloc));

  return {
    decision,
    farmerId,
    alloc: wfResult.alloc,
    released: split.released,
    escrow: split.escrow,
    unused,
  };
}
