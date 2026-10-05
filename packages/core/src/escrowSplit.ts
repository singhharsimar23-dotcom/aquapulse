/**
 * §6.5 Escrow Split: disputed water is held, never cut.
 */
import { CubicMeters, EscrowSplitResult, Hours, asCubicMeters } from './types.js';

/**
 * Splits allocations into released and held (escrowed) water.
 * For REVIEW farmers:
 *   u_i = min(R_i, E_i) * Q_i
 *   released_i = min(alloc_i, u_i)
 *   escrow_i = alloc_i - released_i
 * Non-REVIEW farmers:
 *   released_i = alloc_i
 *   escrow_i = 0
 *
 * @param alloc Weekly allocation per farmer in m³
 * @param R Reported hours (or null)
 * @param E Metered hours (or null)
 * @param review Boolean flag whether farmer is under REVIEW
 * @param Q Well discharge in m³/h (defaults to 1.0)
 */
export function escrowSplit(
  alloc: number[],
  R: (Hours | number | null)[],
  E: (Hours | number | null)[],
  review: boolean[],
  Q?: number[]
): EscrowSplitResult {
  const released: CubicMeters[] = [];
  const escrow: CubicMeters[] = [];

  for (let i = 0; i < alloc.length; i++) {
    const a = alloc[i];
    const r = R[i];
    const e = E[i];
    const rv = review[i];
    const q = Q?.[i] ?? 1.0;

    let x = a;
    if (rv && r !== null && e !== null) {
      const u = Math.min(Number(r), Number(e)) * q;
      x = Math.min(a, u);
    }

    released.push(asCubicMeters(x));
    escrow.push(asCubicMeters(a - x));
  }

  return { released, escrow };
}
