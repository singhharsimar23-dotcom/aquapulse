import { describe, it, expect } from 'vitest';
import { computeHeroFrame } from '../components/hero/frame';
import { FrameGovernor } from '../lib/frameGovernor';
import { computeTier0, SnapshotData } from '../lib/snapshotLoader';

// Mock snapshot identical to public/snapshot.json
const SAMPLE_SNAPSHOT: SnapshotData = {
  zone: 'Zone-A',
  district: 'Wardha',
  state: 'Maharashtra',
  week: 10,
  asOf: '2026-10-05',
  source: 'CGWB / In-GRES telemetry blend',
  hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  B_REF: 130.0,
  pool: 130.0,
  SOE_reports_pct: 89.23076923076924,
  SOE_meter_pct: 110.76923076923077,
  SOE_verified_pct: 103.0,
  sumU: 133.895,
  tier_reports: 'Semi-critical',
  tier_meter: 'Over-exploited',
  tier_verified: 'Over-exploited',
  farmers: [
    {
      id: 'A',
      name: 'Farmer A',
      land: 7.0,
      R: 28.0,
      E: 28.0,
      Q: 1.0,
      coords: [78.601, 20.744],
      flags: [],
    },
    {
      id: 'B',
      name: 'Farmer B',
      land: 7.5,
      R: 30.0,
      E: 30.0,
      Q: 1.0,
      coords: [78.603, 20.746],
      flags: [],
    },
    {
      id: 'C',
      name: 'Farmer C',
      land: 5.0,
      R: 20.0,
      E: 50.0,
      Q: 1.0,
      coords: [78.605, 20.743],
      flags: ['REVIEW', 'METER_MISMATCH'],
    },
    {
      id: 'D',
      name: 'Farmer D',
      land: 9.5,
      R: 38.0,
      E: 36.0,
      Q: 1.0,
      coords: [78.602, 20.748],
      flags: [],
    },
  ],
  provenance: {},
};

const DEFAULT_ASSUMPTIONS = {
  lambda_max: 0.6,
  review_mismatch: 0.5,
  floor_m3: 0.0,
  P_rated: 5.0,
  Kc_min: 0.2,
  Kc_max: 1.15,
};

describe('Hero "The Verify Moment" Pure Frame Engine (§8.4)', () => {
  const model = computeTier0(SAMPLE_SNAPSHOT, DEFAULT_ASSUMPTIONS, false);

  it('Beat 1 (0-6s): shows four dashed SYNTH plots, ghost columns, and ring at 89.2% Semi-critical', () => {
    const frame = computeHeroFrame(3.0, model);
    expect(frame.beat).toBe(1);
    expect(frame.ring.pct).toBeCloseTo(89.23, 1);
    expect(frame.ring.tier).toBe('Semi-critical');

    // All solid heights are 0; ghost heights match R * Q
    const colC = frame.columns.find((c) => c.id === 'C')!;
    expect(colC.ghostHeight).toBe(20.0);
    expect(colC.solidHeight).toBe(0.0);
  });

  it('Beat 2 (6-12s): solid E columns rise, Farmer C towers (50 vs 20), satellite scene active', () => {
    const frame = computeHeroFrame(10.0, model);
    expect(frame.beat).toBe(2);
    const colC = frame.columns.find((c) => c.id === 'C')!;
    expect(colC.isTowering).toBe(true);
    expect(colC.solidHeight).toBeCloseTo(50.0, 0);
    expect(colC.ghostHeight).toBe(20.0);

    expect(frame.satellite.visible).toBe(true);
    expect(frame.satellite.sceneId).toContain('S2A_MSIL2A_20261004');
    expect(frame.satellite.date).toBe('2026-10-04');
  });

  it('Beat 3 (12-19s): columns ease to U, λ_C=0.6, ring eases 89.2% -> 103.0% Over-exploited', () => {
    // Check start of beat 3
    const frameStart = computeHeroFrame(12.0, model);
    expect(frameStart.beat).toBe(3);
    expect(frameStart.ring.pct).toBeCloseTo(89.23, 1);

    // Check end of beat 3 (t=19s)
    const frameEnd = computeHeroFrame(19.0, model);
    expect(frameEnd.beat).toBe(4); // boundary at 19s
    const frameLate = computeHeroFrame(18.9, model);
    expect(frameLate.beat).toBe(3);
    expect(frameLate.ring.pct).toBeCloseTo(103.0, 0);
    expect(frameLate.ring.tier).toBe('Over-exploited');

    const colC = frameLate.columns.find((c) => c.id === 'C')!;
    expect(colC.lambda).toBe(0.6);
    expect(colC.hasReview).toBe(true);
    expect(colC.uValue).toBe(38.0);
  });

  it('Beat 4 (19-28s): pool water-filling allocation and escrow split under scarcity vs pool 130', () => {
    // Scarcity test: at pool = 104 m³
    const frameScarce = computeHeroFrame(22.0, model, { poolOverride: 104 });
    expect(frameScarce.beat).toBe(4);
    expect(frameScarce.allocation.isScarce).toBe(true);
    expect(frameScarce.allocation.scarcityTruth).toContain('Water is scarce');

    // Normal pool = 130 m³: Farmer C has escrow held
    const frame130 = computeHeroFrame(22.0, model, { poolOverride: 130 });
    const colC = frame130.columns.find((c) => c.id === 'C')!;
    expect(colC.hasEscrowHatch).toBe(true);
    expect(colC.releasedValue).toBeCloseTo(20.0, 1);
    expect(colC.escrowValue).toBeCloseTo(14.12, 1);
    expect(frame130.allocation.scarcityTruth).toContain('held in escrow');
  });

  it('Beat 5 (28-35s): Merkle root receipt and tamper demo verification', () => {
    const frameHonest = computeHeroFrame(32.0, model, { isTampered: false });
    expect(frameHonest.beat).toBe(5);
    expect(frameHonest.receipt.isTampered).toBe(false);
    expect(frameHonest.receipt.merkleRoot).toBe(model.merkleRoot);

    // Tampered variant (+10 m3 to Farmer C)
    const frameTampered = computeHeroFrame(32.0, model, { isTampered: true });
    expect(frameTampered.receipt.isTampered).toBe(true);
    expect(frameTampered.receipt.tamperedRoot).toBeDefined();
    expect(frameTampered.receipt.tamperedRoot).not.toEqual(model.merkleRoot);
  });
});

describe('Frame-Time Governor (§8.10)', () => {
  it('engages Lite mode when rolling median frame interval exceeds 24 ms', () => {
    let triggeredLite = false;
    const gov = new FrameGovernor({
      isLite: false,
      onTriggerLite: () => {
        triggeredLite = true;
      },
    });

    // Simulate 40 slow frames (30 ms interval = ~33.3 fps < 41.6 fps)
    let time = 1000;
    for (let i = 0; i < 40; i++) {
      time += 30;
      gov.recordFrame(time);
    }

    expect(triggeredLite).toBe(true);
    expect(gov.getMedianDelta()).toBeGreaterThan(24);
  });

  it('stays in Full mode when frames are fast (16.6 ms = 60 fps)', () => {
    let triggeredLite = false;
    const gov = new FrameGovernor({
      isLite: false,
      onTriggerLite: () => {
        triggeredLite = true;
      },
    });

    let time = 1000;
    for (let i = 0; i < 60; i++) {
      time += 16.6;
      gov.recordFrame(time);
    }

    expect(triggeredLite).toBe(false);
    expect(gov.getMedianDelta()).toBeLessThan(20);
    const profile = gov.getProfile();
    expect(profile.fps).toBeGreaterThanOrEqual(58);
  });
});
