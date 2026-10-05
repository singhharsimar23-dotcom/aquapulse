import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ComputedDashboardModel } from '../lib/snapshotLoader';
import { computeHeroFrame, HeroFrame } from './hero/frame';
import { HeroCanvas } from './hero/HeroCanvas';
import { Num } from './Num';
import { Exempt } from './Exempt';
import { Panel, Chip, Button } from '../design';
import { Prov } from '../lib/prov';
import { FrameGovernor } from '../lib/frameGovernor';
import { useStore } from '../store/useStore';

interface HeroProps {
  model: ComputedDashboardModel;
}

const BEAT_TIMES = [0, 6, 12, 19, 28]; // start time for Beats 1..5

export const Hero: React.FC<HeroProps> = ({ model }) => {
  const { lite, setLite } = useStore();
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [poolOverride, setPoolOverride] = useState<number>(130);
  const [isTampered, setIsTampered] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const governorRef = useRef<FrameGovernor | null>(null);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Initialize frame governor & check prefers-reduced-motion
  useEffect(() => {
    const isProfile = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('profile') === '1';
    governorRef.current = new FrameGovernor({
      isLite: lite,
      onTriggerLite: () => {
        setLite(true);
        setProfileMessage('Governor: Rolling median frame time > 24 ms; switched to Lite mode');
      },
      isProfiling: isProfile,
    });

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [lite, setLite]);

  // Sync lite state to governor
  useEffect(() => {
    if (governorRef.current) {
      governorRef.current.setLite(lite);
    }
  }, [lite]);

  // Compute frame
  const frame: HeroFrame = computeHeroFrame(currentTime, model, {
    poolOverride,
    isTampered,
  });

  // Animation playback loop
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    const step = (timestamp: number) => {
      if (lastTimeRef.current !== null) {
        const delta = (timestamp - lastTimeRef.current) / 1000;
        if (governorRef.current) {
          governorRef.current.recordFrame(timestamp);
        }

        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= 35) {
            // Loop back or hold at end
            return 0;
          }
          return next;
        });
      }
      lastTimeRef.current = timestamp;
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying]);

  // Keyboard navigation per §8.4: Space, 1-5
  const jumpToBeat = useCallback((beatNumber: 1 | 2 | 3 | 4 | 5) => {
    const targetT = BEAT_TIMES[beatNumber - 1];
    setCurrentTime(targetT);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === '1') {
        e.preventDefault();
        jumpToBeat(1);
      } else if (e.key === '2') {
        e.preventDefault();
        jumpToBeat(2);
      } else if (e.key === '3') {
        e.preventDefault();
        jumpToBeat(3);
      } else if (e.key === '4') {
        e.preventDefault();
        jumpToBeat(4);
      } else if (e.key === '5') {
        e.preventDefault();
        jumpToBeat(5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jumpToBeat]);

  const provStress: Prov = {
    kind: frame.beat === 1 ? 'SYNTH' : 'LIVE',
    source: frame.beat === 1 ? 'Reports-only stress estimate' : 'Fused verified aquifer stress',
    asOf: model.asOf,
    hash: model.hash,
  };

  const provSat: Prov = {
    kind: 'LIVE',
    source: 'Sentinel-2 L2A STAC cloud cover',
    asOf: frame.satellite.date,
  };

  const provPool: Prov = {
    kind: 'ASSUMPTION',
    source: 'Weekly safe yield cap pool',
    asOf: model.asOf,
  };

  const minutes = Math.floor(currentTime / 60);
  const seconds = Math.floor(currentTime % 60);
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <Panel
      variant="hero"
      radius="lg"
      className="hero-section"
      title={
        <div className="hero-header-title">
          <span>The Verify Moment</span>
          <Chip variant="LIVE" size="sm">
            <Exempt reason="axis-tick">Interactive 35s Tour</Exempt>
          </Chip>
          {lite && <Chip variant="review" size="sm" label="Lite Mode Active" />}
        </div>
      }
      subtitle="Pure mathematical frame projection: what they said, what grid & sky saw, verification, allocation, and cryptographic receipt."
    >
      {profileMessage && (
        <div className="hero-governor-banner text-2">
          <span>⚡ {profileMessage}</span>
          <button onClick={() => setProfileMessage(null)} className="banner-dismiss-btn">✕</button>
        </div>
      )}

      {/* Hero Visual Stage */}
      <div className="hero-stage">
        {/* Top Overlay HUD */}
        <div className="hero-hud">
          <div className="hud-beat-info" data-prov="SYNTH">
            <span className="hud-beat-badge font-mono">
              <Exempt reason="axis-tick">BEAT {frame.beat}/5</Exempt>
            </span>
            <div className="hud-beat-text">
              <h4 className="hud-beat-title">{frame.beatTitle}</h4>
              <p className="hud-beat-desc text-2">{frame.beatSubtitle}</p>
            </div>
          </div>

          <div className="hud-stress-gauge">
            <span className="text-2 hud-stress-label">Zone Stress (SOE):</span>
            <div className="hud-stress-val">
              <Num
                value={frame.ring.pct}
                prov={provStress}
                unit="%"
                precision={1}
                className="bold"
              />
            </div>
            <Chip
              variant={frame.ring.pct > 100 ? 'critical' : 'review'}
              size="sm"
              label={frame.ring.tier}
            />
          </div>
        </div>

        {/* 2D/2.5D Canvas Scene */}
        <HeroCanvas
          frame={frame}
          lite={lite}
          reducedMotion={reducedMotion}
        />

        {/* Satellite Scene Badge (Beat 2 & 3) */}
        {frame.satellite.visible && (
          <div className="hero-satellite-card panel-radius-md" role="region" aria-label="Satellite Imagery Provenance">
            <div className="sat-card-title text-2" data-prov-exempt="scene-id">
              <span className="sat-icon">🛰️</span>
              <span>Sentinel-2 L2A Corroboration</span>
            </div>
            <div className="sat-card-row">
              <span className="text-3">Scene:</span>
              <Exempt reason="scene-id" className="font-mono text-1 sat-scene-text">
                {frame.satellite.sceneId}
              </Exempt>
            </div>
            <div className="sat-card-row">
              <span className="text-3">Acquired:</span>
              <Exempt reason="date" className="font-mono text-1">
                {frame.satellite.date}
              </Exempt>
            </div>
            <div className="sat-card-row">
              <span className="text-3">Cloud:</span>
              <Num value={frame.satellite.cloudPct} prov={provSat} unit="%" precision={1} />
            </div>
          </div>
        )}

        {/* Beat 4 Scarcity / Allocation Controls */}
        {frame.beat === 4 && (
          <div className="hero-allocation-hud panel-radius-md">
            <div className="alloc-hud-header">
              <span className="text-2">Safe Yield Pool Cap:</span>
              <Num value={poolOverride} prov={provPool} unit="m³" precision={0} />
            </div>
            <div className="alloc-slider-row">
              <Exempt reason="axis-tick" className="text-3 font-mono">104 m³</Exempt>
              <input
                type="range"
                min={104}
                max={130}
                step={1}
                value={poolOverride}
                onChange={(e) => setPoolOverride(Number(e.target.value))}
                aria-label="Adjust Safe Yield Cap Pool"
                className="alloc-pool-slider"
              />
              <Exempt reason="axis-tick" className="text-3 font-mono">130 m³</Exempt>
            </div>
            <div className="scarcity-truth-banner" data-prov="ASSUMPTION">
              <span className="truth-icon">⚖️</span>
              <span className="truth-text">{frame.allocation.scarcityTruth}</span>
            </div>
          </div>
        )}

        {/* Beat 5 Receipt & Tamper Demo */}
        {frame.beat === 5 && (
          <div className="hero-receipt-hud panel-radius-md">
            <div className="receipt-hud-header">
              <span className="text-2">Merkle Root Receipt:</span>
              <Exempt reason="hash" className="font-mono receipt-root-badge">
                {frame.receipt.isTampered ? frame.receipt.tamperedRoot : frame.receipt.merkleRoot}
              </Exempt>
            </div>

            <div className="tamper-actions" data-prov-exempt="map-control">
              <Button
                variant={frame.receipt.isTampered ? 'danger' : 'outline'}
                size="sm"
                onClick={() => setIsTampered((prev) => !prev)}
              >
                {frame.receipt.isTampered
                  ? '↺ Revert to Honest Ledger'
                  : '⚠️ Tamper Demo (+10 m³ to C)'}
              </Button>
              {frame.receipt.isTampered && (
                <div className="tamper-alert" role="alert">
                  <span className="alert-icon">✕</span>
                  <span>TAMPER DETECTED: Computed root differs from signed commitment!</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scrub Bar & Transport Controls */}
      <div className="hero-transport" role="region" aria-label="Hero Timeline Controls">
        <div className="transport-controls">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? 'Pause Hero Tour' : 'Play Hero Tour'}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </Button>

          <div className="transport-time">
            <Exempt reason="axis-tick" className="font-mono tabular-nums text-1">
              {timeFormatted}
            </Exempt>
            <span className="text-3"> / </span>
            <Exempt reason="axis-tick" className="font-mono tabular-nums text-3">
              00:35
            </Exempt>
          </div>

          <div className="beat-shortcuts" role="group" aria-label="Jump to Beat">
            {[1, 2, 3, 4, 5].map((b) => (
              <button
                key={b}
                className={`beat-btn ${frame.beat === b ? 'active' : ''}`}
                onClick={() => jumpToBeat(b as 1 | 2 | 3 | 4 | 5)}
                aria-label={`Jump to Beat ${b}`}
              >
                <Exempt reason="axis-tick">{b}</Exempt>
              </button>
            ))}
          </div>
        </div>

        <div className="scrubber-wrapper">
          <input
            type="range"
            min={0}
            max={35}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              setCurrentTime(Number(e.target.value));
              setIsPlaying(false);
            }}
            aria-label="Hero Timeline Scrubber"
            className="hero-scrub-slider"
          />
          <div className="scrubber-ticks" aria-hidden="true">
            <span style={{ left: '0%' }}>What they said</span>
            <span style={{ left: '17.1%' }}>Grid & sky</span>
            <span style={{ left: '34.2%' }}>Verify</span>
            <span style={{ left: '54.2%' }}>Allocate</span>
            <span style={{ left: '80%' }}>Receipt</span>
          </div>
        </div>
      </div>
    </Panel>
  );
};
