import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { ComputedDashboardModel } from '../lib/snapshotLoader';
import { Num } from './Num';
import { Exempt } from './Exempt';
import { Prov } from '../lib/prov';

interface DrillPresetsBarProps {
  model: ComputedDashboardModel;
}

const PRESETS = [
  { id: 'Zone-A benchmark', label: 'Zone-A Benchmark', icon: '📍', desc: '§6.11 Golden vectors (R=[28,30,20,38], E=[28,30,50,36])' },
  { id: 'Incorrect data', label: 'Incorrect Data Drill', icon: '🚨', desc: 'Discrepancy on Farmer C (R=20, E=50) -> REVIEW & Escrow' },
  { id: 'Severe stress', label: 'Severe Stress Drill', icon: '🔥', desc: 'Curtailment to Pool 78 m³ -> land-proportional cut' },
  { id: 'Different crops', label: 'Different Crops', icon: '🌾', desc: 'Heterogeneous crop water demands across farmers' },
  { id: 'Dead meter', label: 'Dead Meter Drill', icon: '🔌', desc: 'Missing meter on Farmer C -> NO_METER, U=R' },
  { id: 'Load my CSV', label: 'Load My CSV', icon: '📁', desc: 'Bring-your-own browser parsed CSV file' },
];

export const DrillPresetsBar: React.FC<DrillPresetsBarProps> = ({ model }) => {
  const {
    activePreset,
    applyPreset,
    farmerOverrides,
    setFarmerOverride,
    resetFarmerOverrides,
    stressViewMode,
    setStressViewMode,
    setCsvModalOpen,
    setCommitteeModalOpen,
  } = useStore();

  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

  const prov = (source: string): Prov => ({
    kind: 'LIVE',
    source,
    asOf: model.asOf,
    hash: model.hash,
  });

  return (
    <div className="drill-presets-bar" role="region" aria-label="Drill Presets and Stress Sandboxes">
      <div className="presets-top-row">
        {/* Presets List */}
        <div className="presets-pill-group">
          <span className="presets-label text-2">
            Drill Presets (<Exempt reason="id">W12</Exempt>):
          </span>
          {PRESETS.map((p) => {
            const isActive = activePreset === p.id;
            return (
              <button
                key={p.id}
                className={`preset-pill ${isActive ? 'active' : ''}`}
                onClick={() => applyPreset(p.id)}
                title={p.desc}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Before/After Stress Toggle */}
        <div className="stress-mode-selector">
          <span className="stress-mode-label text-2">Stress View:</span>
          <button
            className={`stress-tab ${stressViewMode === 'reports' ? 'active text-review' : ''}`}
            onClick={() => setStressViewMode('reports')}
            title="Reports-only: sum(R)/130 = 89.2% Semi-critical"
          >
            Reports (<Exempt reason="axis-tick">89.2%</Exempt>)
          </button>
          <button
            className={`stress-tab ${stressViewMode === 'meter' ? 'active text-review' : ''}`}
            onClick={() => setStressViewMode('meter')}
            title="Meter-only: sum(E)/130 = 110.8% Over-exploited"
          >
            Meter (<Exempt reason="axis-tick">110.8%</Exempt>)
          </button>
          <button
            className={`stress-tab ${stressViewMode === 'verified' ? 'active text-ok' : ''}`}
            onClick={() => setStressViewMode('verified')}
            title="Dual-signal verified blend: sum(U)/130 = 103.0% Over-exploited"
          >
            Verified (<Exempt reason="axis-tick">103.0%</Exempt>)
          </button>
        </div>

        {/* Sandbox & Tools buttons */}
        <div className="presets-tools">
          <button
            className={`sandbox-toggle-btn ${isSandboxOpen ? 'open' : ''}`}
            onClick={() => setIsSandboxOpen(!isSandboxOpen)}
          >
            🎮 {isSandboxOpen ? 'Hide Sliders' : 'R & E Sliders'}
          </button>
          <button
            className="csv-open-btn"
            onClick={() => setCsvModalOpen(true)}
            title="Open Bring-Your-Own CSV (§8.11)"
          >
            📂 BYO CSV
          </button>
        </div>
      </div>

      {/* Expandable Farmer Sliders Sandbox (0-60h per farmer, plus missing toggle) */}
      {isSandboxOpen && (
        <div className="sandbox-panel">
          <div className="sandbox-header">
            <div>
              <h4 className="sandbox-title">Farmer Telemetry Sliders (0–60 h) & Missing Toggles</h4>
              <span className="text-2">
                Simulate arbitrary reported pumping (R) and meter hours (E). Real-time browser TS core execution.
              </span>
            </div>
            <button className="sandbox-reset-btn" onClick={resetFarmerOverrides}>
              ↺ Reset Sliders
            </button>
          </div>

          <div className="farmer-sliders-grid">
            {model.farmers.map((f) => {
              const currentR = f.R;
              const currentE = f.E;
              const isRMissing = currentR === null;
              const isEMissing = currentE === null;

              return (
                <div key={f.id} className="farmer-slider-card">
                  <div className="slider-card-top">
                    <span className="farmer-badge font-mono">
                      <Exempt reason="id">{f.id}</Exempt>
                    </span>
                    <span className="farmer-name-sm">{f.name}</span>
                    <span className="demand-computed-badge font-mono text-ok">
                      U = {f.U.toFixed(1)} h
                    </span>
                  </div>

                  {/* R Slider */}
                  <div className="slider-row">
                    <div className="slider-row-labels">
                      <span className="slider-name text-2">Reported (R):</span>
                      <span className="slider-val font-mono">
                        {isRMissing ? <span className="text-review">null</span> : `${currentR} h`}
                      </span>
                    </div>
                    <div className="slider-input-group">
                      <input
                        type="range"
                        min="0"
                        max="60"
                        step="1"
                        value={currentR ?? 0}
                        disabled={isRMissing}
                        onChange={(e) => setFarmerOverride(f.id, { R: Number(e.target.value) })}
                        className="telemetry-slider"
                      />
                      <label className="missing-checkbox-label">
                        <input
                          type="checkbox"
                          checked={isRMissing}
                          onChange={(e) => setFarmerOverride(f.id, { R: e.target.checked ? null : 20 })}
                        />
                        <span className="text-2">Missing</span>
                      </label>
                    </div>
                  </div>

                  {/* E Slider */}
                  <div className="slider-row">
                    <div className="slider-row-labels">
                      <span className="slider-name text-2">Meter (E):</span>
                      <span className="slider-val font-mono">
                        {isEMissing ? <span className="text-review">null</span> : `${currentE} h`}
                      </span>
                    </div>
                    <div className="slider-input-group">
                      <input
                        type="range"
                        min="0"
                        max="60"
                        step="1"
                        value={currentE ?? 0}
                        disabled={isEMissing}
                        onChange={(e) => setFarmerOverride(f.id, { E: Number(e.target.value) })}
                        className="telemetry-slider"
                      />
                      <label className="missing-checkbox-label">
                        <input
                          type="checkbox"
                          checked={isEMissing}
                          onChange={(e) => setFarmerOverride(f.id, { E: e.target.checked ? null : 20 })}
                        />
                        <span className="text-2">Missing</span>
                      </label>
                    </div>
                  </div>

                  {/* Flags & Review Action */}
                  <div className="slider-card-footer">
                    <span className="flags-sm text-2">
                      Flags: {f.flags.join(', ') || 'OK'}
                    </span>
                    {f.escrow > 0 && (
                      <button
                        className="mini-committee-btn"
                        onClick={() => setCommitteeModalOpen(true, f.id)}
                      >
                        ⚖️ Hearing
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
