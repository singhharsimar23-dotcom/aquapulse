import { describe, it, expect } from 'vitest';
import { useStore } from '../store/useStore';
import { theisConeRadius, checkInterference } from '@aquapulse/core';

describe('S7 Core Layers, Widgets & Cross-Filter', () => {
  it('initializes default visible widgets W1, W2, W3, W5, W9 per §8.8', () => {
    const { widgets } = useStore.getState();
    expect(widgets.w1.visible).toBe(true);
    expect(widgets.w2.visible).toBe(true);
    expect(widgets.w3.visible).toBe(true);
    expect(widgets.w5.visible).toBe(true);
    expect(widgets.w9.visible).toBe(true);
    expect(widgets.inspector.visible).toBe(true);
  });

  it('updates widget layout and coordinates', () => {
    const { updateWidgetLayout } = useStore.getState();
    updateWidgetLayout('w1', { x: 150, y: 220, pinned: true });
    const updated = useStore.getState().widgets.w1;
    expect(updated.x).toBe(150);
    expect(updated.y).toBe(220);
    expect(updated.pinned).toBe(true);
  });

  it('toggles widget visibility', () => {
    const { toggleWidgetVisible } = useStore.getState();
    const prev = useStore.getState().widgets.w6.visible;
    toggleWidgetVisible('w6');
    expect(useStore.getState().widgets.w6.visible).toBe(!prev);
    // revert
    toggleWidgetVisible('w6');
  });

  it('performs cross-filter selection', () => {
    const { setSelectedFarmerId } = useStore.getState();
    setSelectedFarmerId('C');
    expect(useStore.getState().selectedFarmerId).toBe('C');
    expect(useStore.getState().selectedObject?.id).toBe('C');
    expect(useStore.getState().selectedObject?.type).toBe('farmer');

    setSelectedFarmerId(null);
    expect(useStore.getState().selectedFarmerId).toBeNull();
    expect(useStore.getState().selectedObject).toBeNull();
  });

  it('computes Layer 3 Theis cone radius by bisection (§6.6)', () => {
    const radius = theisConeRadius(38.0, 45.0, 0.005, 7, 0.1);
    expect(radius).toBeGreaterThan(0);
    expect(radius).toBeLessThan(5000);
  });

  it('computes Layer 5 mutual interference pairs (§6.6)', () => {
    const wells = [
      { x: 0, y: 0, Q_m3d: 50 },
      { x: 40, y: 0, Q_m3d: 50 },
      { x: 10000, y: 10000, Q_m3d: 50 },
    ];
    const pairs = checkInterference(wells, 45.0, 0.005, 7, 0.1);
    expect(pairs.length).toBe(3);
    const closePair = pairs.find((p) => p.i === 0 && p.j === 1);
    expect(closePair?.interferes).toBe(true);
  });
});
