import React from 'react';
import { ComputedDashboardModel } from '../../lib/snapshotLoader';
import { useStore } from '../../store/useStore';
import { Num } from '../Num';
import { Exempt } from '../Exempt';
import { Chip } from '../../design';
import { Prov } from '../../lib/prov';

interface W3ZoneStressProps {
  model: ComputedDashboardModel;
}

export const W3ZoneStress: React.FC<W3ZoneStressProps> = ({ model }) => {
  const { stressViewMode, setStressViewMode } = useStore();

  const getProv = (kind: 'SYNTH' | 'LIVE' | 'REPLAY' | 'ASSUMPTION' | 'USER', source: string): Prov => ({
    kind,
    source,
    asOf: model.asOf,
    hash: model.hash,
  });

  const provSOE = getProv('LIVE', 'Dual-signal telemetry blend against CGWB B_REF');
  const provBRef = getProv('ASSUMPTION', 'CGWB FY2025 Block Assessment Safe Yield');
  const provPool = getProv('LIVE', 'Conformal bucket forecast cap pool');

  // Before/after-verification stress view
  let soe = model.SOE_verified_pct;
  let tier = model.tier_verified;
  let modeLabel = 'Verified Dual-Signal Blend';
  if (stressViewMode === 'reports') {
    soe = model.SOE_reports_pct;
    tier = model.tier_reports;
    modeLabel = 'Reports-Only Demand';
  } else if (stressViewMode === 'meter') {
    soe = model.SOE_meter_pct;
    tier = model.tier_meter;
    modeLabel = 'Feeder Meter-Only Demand';
  }

  // Needle angle for semicircular gauge: 0% -> -90deg, 150% -> 90deg
  const clampSoe = Math.min(150, Math.max(0, soe));
  const needleRotation = -90 + (clampSoe / 150) * 180;


  return (
    <div className="w3-zone-stress" role="region" aria-label="W3 Zone Stress Gauge">
      <div className="gauge-container">
        <svg viewBox="0 0 200 120" className="gauge-svg" aria-label={`SOE Gauge ${soe.toFixed(1)}%`}>
          {/* Segment arcs */}
          {/* Safe: 0 to 70% (0 to 84 deg) */}
          <path
            d="M 20 100 A 80 80 0 0 1 65.5 35.8"
            fill="none"
            stroke="#3DDC97"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Semi-critical: 70 to 90% (84 to 108 deg) */}
          <path
            d="M 69.5 32.8 A 80 80 0 0 1 100 20"
            fill="none"
            stroke="#4D96FF"
            strokeWidth="16"
          />
          {/* Critical: 90 to 100% (108 to 120 deg) */}
          <path
            d="M 104 20.2 A 80 80 0 0 1 123.5 24.5"
            fill="none"
            stroke="#FFB547"
            strokeWidth="16"
          />
          {/* Over-exploited: 100 to 150% (120 to 180 deg) */}
          <path
            d="M 127.5 26.5 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#FF4D4D"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Needle */}
          <g transform={`translate(100, 100) rotate(${needleRotation})`}>
            <polygon points="-3,-10 3,-10 0,-70" fill="#E6EDF3" />
            <circle cx="0" cy="0" r="6" fill="#00E5FF" />
          </g>

          {/* Ticks */}
          <text x="16" y="115" className="gauge-tick" fill="#8B949E" fontSize="9">
            0%
          </text>
          <text x="56" y="24" className="gauge-tick" fill="#8B949E" fontSize="9">
            70%
          </text>
          <text x="94" y="12" className="gauge-tick" fill="#8B949E" fontSize="9">
            90%
          </text>
          <text x="126" y="18" className="gauge-tick" fill="#8B949E" fontSize="9">
            100%
          </text>
          <text x="168" y="115" className="gauge-tick" fill="#8B949E" fontSize="9">
            150%
          </text>
        </svg>

        <div className="gauge-readout">
          <div className="gauge-val-row">
            <Num value={soe} prov={provSOE} precision={1} unit="%" className="gauge-num" />
          </div>
          <Chip
            variant={tier === 'Over-exploited' ? 'critical' : tier === 'Critical' ? 'review' : 'ok'}
            size="md"
            label={tier}
          />
          <span className="mode-sublabel text-2">{modeLabel}</span>
        </div>
      </div>

      <div className="stress-mode-pills">
        <button
          className={`mode-btn ${stressViewMode === 'reports' ? 'active' : ''}`}
          onClick={() => setStressViewMode('reports')}
        >
          Reports (89.2%)
        </button>
        <button
          className={`mode-btn ${stressViewMode === 'meter' ? 'active' : ''}`}
          onClick={() => setStressViewMode('meter')}
        >
          Meter (110.8%)
        </button>
        <button
          className={`mode-btn ${stressViewMode === 'verified' ? 'active' : ''}`}
          onClick={() => setStressViewMode('verified')}
        >
          Verified (103.0%)
        </button>
      </div>


      <div className="gauge-meta-list">
        <div className="gauge-meta-item">
          <span className="meta-k text-2">CGWB Baseline (B_REF):</span>
          <Num value={model.B_REF} prov={provBRef} unit="m³" precision={1} />
        </div>
        <div className="gauge-meta-item">
          <span className="meta-k text-2">Weekly Cap Pool:</span>
          <Num value={model.pool} prov={provPool} unit="m³" precision={1} />
        </div>
        <div className="gauge-meta-item">
          <span className="meta-k text-2">Cap Source:</span>
          <span className="meta-v font-mono text-2">
            <Exempt reason="id">Conformal Bucket Forecast (§6.4)</Exempt>
          </span>
        </div>
        <div className="gauge-meta-item">
          <span className="meta-k text-2">Active Zone:</span>
          <span className="meta-v font-mono text-2">
            <Exempt reason="id">{model.zone}</Exempt> (Wardha)
          </span>
        </div>
      </div>
    </div>
  );
};
