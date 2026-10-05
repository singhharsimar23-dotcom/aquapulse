import { describe, it, expect } from 'vitest';
import { theisConeRadius, checkInterference, theisDrawdown } from '../src/theis.js';

describe('§6.6 Theis Cone of Depression & Interference', () => {
  const T = 45; // m2/d Deccan basalt
  const S = 0.005; // storativity
  const t = 7; // days
  const Q = 100; // m3/d
  const s_thresh = 0.1; // meters

  it('computes cone of depression radius where drawdown equals s_thresh', () => {
    const radius = theisConeRadius(Q, T, S, t, s_thresh);
    expect(radius).toBeGreaterThan(0);
    const s_at_radius = theisDrawdown(Q, T, S, radius, t);
    expect(Math.abs(s_at_radius - s_thresh)).toBeLessThan(1e-3);
  });

  it('detects interference between neighboring wells', () => {
    const wells = [
      { x: 0, y: 0, Q_m3d: 150 },
      { x: 50, y: 0, Q_m3d: 150 },
      { x: 5000, y: 5000, Q_m3d: 150 },
    ];
    const pairs = checkInterference(wells, T, S, t, s_thresh);
    expect(pairs.length).toBe(3);
    const closePair = pairs.find((p) => p.i === 0 && p.j === 1);
    expect(closePair?.interferes).toBe(true);
    const farPair = pairs.find((p) => p.i === 0 && p.j === 2);
    expect(farPair?.interferes).toBe(false);
  });
});
