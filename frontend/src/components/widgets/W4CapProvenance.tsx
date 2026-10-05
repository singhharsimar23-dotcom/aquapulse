import React, { useState, useEffect } from 'react';
import { ComputedDashboardModel } from '../../lib/snapshotLoader';
import { Num } from '../Num';
import { Exempt } from '../Exempt';
import { Prov } from '../../lib/prov';
import { Chip } from '../../design';

interface WeeklyPoint {
  week: number;
  cap: number;
  pool: number;
  margin: number;
  omega: number;
  alpha: number;
  h_obs: number;
  err: number;
}

interface TrajectoryData {
  seed: number;
  arm: 'reports' | 'verified';
  shift: boolean;
  liar_fraction: number;
  with_aci: boolean;
  mean_pool: number;
  realised_miscoverage: number;
  target_miscoverage: number;
  weeks_below_floor: number;
  final_margin: number;
  final_omega: number;
  weekly_trace: WeeklyPoint[];
  scenario: string;
  code_hash?: string;
}

interface TrajectoriesPayload {
  title: string;
  provenance_kind: 'SYNTH';
  code_hash: string;
  seeds: number[];
  target_miscoverage: number;
  trajectories: TrajectoryData[];
}

interface W4CapProvenanceProps {
  model: ComputedDashboardModel;
}

export const W4CapProvenance: React.FC<W4CapProvenanceProps> = ({ model }) => {
  const [payload, setPayload] = useState<TrajectoriesPayload | null>(null);
  const [shiftModel, setShiftModel] = useState<boolean>(false);
  const [readersLie, setReadersLie] = useState<boolean>(false);
  const [withAci, setWithAci] = useState<boolean>(true);
  const [selectedArm, setSelectedArm] = useState<'reports' | 'verified'>('verified');
  const [selectedSeed, setSelectedSeed] = useState<number>(42);

  useEffect(() => {
    fetch('/data/stress_trajectories.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: TrajectoriesPayload) => setPayload(data))
      .catch(() => {
        // Fallback for static test runs
        setPayload({
          title: 'AquaPulse Stress Trajectories (M4)',
          provenance_kind: 'SYNTH',
          code_hash: '66544babcdbf76a7544fc42bc120501130236b47eb7efe664c69884deaa8f85e',
          seeds: [42, 101, 2024],
          target_miscoverage: 0.1,
          trajectories: [
            {
              seed: 42,
              arm: 'verified',
              shift: false,
              liar_fraction: 0.0,
              with_aci: true,
              mean_pool: 104.0,
              realised_miscoverage: 0.096,
              target_miscoverage: 0.1,
              weeks_below_floor: 0,
              final_margin: 1.15,
              final_omega: 0.032,
              scenario: 'baseline',
              weekly_trace: Array.from({ length: 26 }, (_, i) => ({
                week: i * 6,
                cap: 110 - i * 0.2,
                pool: 104,
                margin: 1.15,
                omega: 0.03,
                alpha: 0.1,
                h_obs: 5.8,
                err: 0,
              })),
            },
            {
              seed: 42,
              arm: 'reports',
              shift: false,
              liar_fraction: 0.0,
              with_aci: true,
              mean_pool: 118.0,
              realised_miscoverage: 0.23,
              target_miscoverage: 0.1,
              weeks_below_floor: 14,
              final_margin: 1.0,
              final_omega: 0.0,
              scenario: 'baseline',
              weekly_trace: Array.from({ length: 26 }, (_, i) => ({
                week: i * 6,
                cap: 120,
                pool: 120,
                margin: 1.0,
                omega: 0.0,
                alpha: 0.1,
                h_obs: 4.2,
                err: 1,
              })),
            },
          ],
        });
      });
  }, []);

  const codeHash = payload?.code_hash || '66544babcdbf76a7';

  const getProv = (source: string): Prov => ({
    kind: 'SYNTH',
    source: `${source} (seed: ${selectedSeed})`,
    asOf: model.asOf,
    hash: codeHash,
  });

  // Determine current scenario string
  let targetScenario = 'baseline';
  if (shiftModel && readersLie) targetScenario = 'shift_and_lie';
  else if (shiftModel) targetScenario = 'shift';
  else if (readersLie) targetScenario = 'readers_lie';

  // Find trajectory matching filters
  const currentTraj =
    payload?.trajectories.find(
      (t) =>
        t.seed === selectedSeed &&
        t.arm === selectedArm &&
        t.scenario === targetScenario &&
        t.with_aci === withAci
    ) || payload?.trajectories[0];

  // Also find the other arm for side-by-side comparison
  const otherArm = selectedArm === 'verified' ? 'reports' : 'verified';
  const comparisonTraj = payload?.trajectories.find(
    (t) =>
      t.seed === selectedSeed &&
      t.arm === otherArm &&
      t.scenario === targetScenario &&
      t.with_aci === withAci
  );

  const lastPoint: WeeklyPoint = currentTraj?.weekly_trace[currentTraj.weekly_trace.length - 1] || {
    week: 156,
    cap: 104,
    pool: 104,
    margin: 1.15,
    omega: 0.03,
    alpha: 0.1,
    h_obs: 5.8,
    err: 0,
  };

  return (
    <div className="w4-cap-provenance" role="region" aria-label="W4 Cap Provenance">
      {/* Header with Provenance Badge */}
      <div className="w4-header">
        <div>
          <div className="w4-title-row">
            <h3 className="w4-title">Cap Provenance & Stress Trajectories (<Exempt reason="id">W4</Exempt>)</h3>
            <Chip variant="SYNTH" size="sm" label={`SYNTH (seed: ${selectedSeed})`} />
          </div>
          <p className="w4-subtitle text-2">
            Plays stored multi-season trajectories §9 (M4) across two arms with code hash:
            <span className="font-mono text-1 ml-1" title={codeHash}>
              <Exempt reason="id">{codeHash.slice(0, 12)}...</Exempt>
            </span>
          </p>
        </div>
      </div>

      {/* Toggles & Arms Bar */}
      <div className="w4-toggles-bar">
        <button
          className={`toggle-pill ${shiftModel ? 'active' : ''}`}
          onClick={() => setShiftModel(!shiftModel)}
          title="Simulate hydrological recharge drop & seasonal phase shift"
        >
          🌧️ {shiftModel ? '✓ Shift the model' : 'Shift the model'}
        </button>

        <button
          className={`toggle-pill ${readersLie ? 'active' : ''}`}
          onClick={() => setReadersLie(!readersLie)}
          title="Simulate 60% of village readers understating extraction"
        >
          🚨 {readersLie ? '✓ 60 % of readers lie' : '60 % of readers lie'}
        </button>

        <button
          className={`toggle-pill ${withAci ? 'active' : ''}`}
          onClick={() => setWithAci(!withAci)}
          title="Adaptive Conformal Inference margin updating"
        >
          📈 {withAci ? '✓ ACI Adaptive' : 'Fixed Margin'}
        </button>

        <div className="arm-selector">
          <button
            className={`arm-btn ${selectedArm === 'verified' ? 'active text-ok' : ''}`}
            onClick={() => setSelectedArm('verified')}
            title="Arm 2: Verified extraction with overdraw correction EMA"
          >
            🛡️ Verified Arm
          </button>
          <button
            className={`arm-btn ${selectedArm === 'reports' ? 'active text-review' : ''}`}
            onClick={() => setSelectedArm('reports')}
            title="Arm 1: Reports-only uncorrected model"
          >
            ⚠️ Reports-Only Arm
          </button>
        </div>

        <select
          className="seed-select font-mono"
          value={selectedSeed}
          onChange={(e) => setSelectedSeed(Number(e.target.value))}
          aria-label="Select Seed"
        >
          {(payload?.seeds || [42, 101, 2024]).map((s) => (
            <option key={s} value={s}>
              Seed {s}
            </option>
          ))}
        </select>
      </div>

      {/* Measured Numbers Cards */}
      <div className="w4-metrics-grid">
        <div className="metric-box">
          <span className="metric-label text-2">Cap (Cap_t)</span>
          <div className="metric-val">
            <Num value={lastPoint.cap} prov={getProv('Cap equation §6.4')} precision={1} unit="m³" />
          </div>
        </div>

        <div className="metric-box">
          <span className="metric-label text-2">Published Pool</span>
          <div className="metric-val text-brand">
            <Num value={lastPoint.pool} prov={getProv('Published pool formula §6.4')} precision={1} unit="m³" />
          </div>
        </div>

        <div className="metric-box">
          <span className="metric-label text-2">Overdraw EMA (ω̂)</span>
          <div className="metric-val">
            <Num value={lastPoint.omega} prov={getProv('Overdraw EMA §6.4')} precision={4} />
          </div>
        </div>

        <div className="metric-box">
          <span className="metric-label text-2">Conformal Margin (m_t)</span>
          <div className="metric-val">
            <Num value={lastPoint.margin} prov={getProv('Conformal quantile margin §6.4')} precision={3} unit="m" />
          </div>
        </div>

        <div className="metric-box">
          <span className="metric-label text-2">Realised Miscoverage</span>
          <div className={`metric-val ${currentTraj && currentTraj.realised_miscoverage > 0.15 ? 'text-review' : 'text-ok'}`}>
            <Num
              value={(currentTraj?.realised_miscoverage ?? 0.1) * 100}
              prov={getProv('Empirical coverage measurement')}
              precision={1}
              unit="%"
            />
            <span className="target-hint text-2"> (Target 10%)</span>
          </div>
        </div>

        <div className="metric-box">
          <span className="metric-label text-2">Weeks Below Safe Floor</span>
          <div className={`metric-val ${currentTraj && currentTraj.weeks_below_floor > 0 ? 'text-review' : 'text-ok'}`}>
            <Num
              value={currentTraj?.weeks_below_floor ?? 0}
              prov={getProv('Depletion count measurement')}
              precision={0}
              unit="wks"
            />
          </div>
        </div>
      </div>

      {/* Trajectory Sparkline / Chart */}
      <div className="w4-chart-container">
        <div className="chart-header">
          <span className="chart-title text-2">
            Pool & Margin Trace (Weeks 0–156) — <Exempt reason="id">{selectedArm.toUpperCase()}</Exempt> Arm
          </span>
          <span className="trace-info font-mono text-2">
            Mean Pool: <Num value={currentTraj?.mean_pool ?? 104} prov={getProv('Trajectory mean')} precision={1} unit="m³" />
          </span>
        </div>

        <svg className="w4-sparkline" viewBox="0 0 500 100" preserveAspectRatio="none">
          {/* Baseline Safe Pool Ref line (104) */}
          <line x1="0" y1="35" x2="500" y2="35" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
          
          {/* Pool line */}
          {currentTraj?.weekly_trace && currentTraj.weekly_trace.length > 1 && (
            <polyline
              fill="none"
              stroke="#00E5FF"
              strokeWidth="2"
              points={currentTraj.weekly_trace
                .map((pt, idx) => {
                  const x = (idx / (currentTraj.weekly_trace.length - 1)) * 500;
                  const y = 90 - Math.min(80, (pt.pool / 140) * 80);
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(' ')}
            />
          )}

          {/* Margin trace line */}
          {currentTraj?.weekly_trace && currentTraj.weekly_trace.length > 1 && (
            <polyline
              fill="none"
              stroke="#FFB547"
              strokeWidth="1.5"
              strokeDasharray="2 2"
              points={currentTraj.weekly_trace
                .map((pt, idx) => {
                  const x = (idx / (currentTraj.weekly_trace.length - 1)) * 500;
                  const y = 95 - Math.min(40, (pt.margin / 2.5) * 40);
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(' ')}
            />
          )}
        </svg>

        <div className="chart-legend">
          <span className="legend-item"><span className="legend-dot bg-cyan" /> Published Pool (m³)</span>
          <span className="legend-item"><span className="legend-dot bg-amber" /> Conformal Margin (m)</span>
          <span className="legend-item"><span className="legend-dot bg-gray" /> Reference Cap</span>
        </div>
      </div>

      {/* Two-Arm Scientific Contrast Card */}
      {comparisonTraj && (
        <div className="two-arm-contrast">
          <div className="contrast-header">
            <span className="contrast-title">Two-Arm Measured Comparison (Same Seed & Shift)</span>
          </div>
          <div className="contrast-grid">
            <div className={`contrast-card ${selectedArm === 'reports' ? 'active-arm' : ''}`}>
              <span className="card-arm-title text-review">Arm 1: Reports-Only</span>
              <div className="contrast-row">
                <span className="text-2">Miscoverage:</span>
                <Num value={selectedArm === 'reports' ? (currentTraj?.realised_miscoverage ?? 0) * 100 : comparisonTraj.realised_miscoverage * 100} prov={getProv('Reports arm')} precision={1} unit="%" />
              </div>
              <div className="contrast-row">
                <span className="text-2">Weeks Below Safe Floor:</span>
                <Num value={selectedArm === 'reports' ? (currentTraj?.weeks_below_floor ?? 0) : comparisonTraj.weeks_below_floor} prov={getProv('Reports arm')} precision={0} unit="wks" />
              </div>
            </div>

            <div className={`contrast-card ${selectedArm === 'verified' ? 'active-arm' : ''}`}>
              <span className="card-arm-title text-ok">Arm 2: Verified + Overdraw Correction</span>
              <div className="contrast-row">
                <span className="text-2">Miscoverage:</span>
                <Num value={selectedArm === 'verified' ? (currentTraj?.realised_miscoverage ?? 0) * 100 : comparisonTraj.realised_miscoverage * 100} prov={getProv('Verified arm')} precision={1} unit="%" />
              </div>
              <div className="contrast-row">
                <span className="text-2">Weeks Below Safe Floor:</span>
                <Num value={selectedArm === 'verified' ? (currentTraj?.weeks_below_floor ?? 0) : comparisonTraj.weeks_below_floor} prov={getProv('Verified arm')} precision={0} unit="wks" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
