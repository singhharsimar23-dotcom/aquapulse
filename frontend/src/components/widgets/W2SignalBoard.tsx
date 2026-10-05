import React from 'react';
import { ComputedDashboardModel } from '../../lib/snapshotLoader';
import { useStore } from '../../store/useStore';
import { Num } from '../Num';
import { Exempt } from '../Exempt';
import { Chip } from '../../design';
import { Prov } from '../../lib/prov';

interface W2SignalBoardProps {
  model: ComputedDashboardModel;
}

export const W2SignalBoard: React.FC<W2SignalBoardProps> = ({ model }) => {
  const { selectedFarmerId, setSelectedFarmerId } = useStore();

  const getProv = (kind: 'SYNTH' | 'LIVE' | 'REPLAY' | 'ASSUMPTION' | 'USER', source: string): Prov => ({
    kind,
    source,
    asOf: model.asOf,
    hash: model.hash,
  });

  const provSynth = getProv('SYNTH', 'Village self-reports register');
  const provLive = getProv('LIVE', 'Feeder meter telemetry');
  const provBlend = getProv('LIVE', 'Dual-signal verified calculation');

  return (
    <div className="w2-signal-board" role="region" aria-label="W2 Signal Board">
      {/* Effect on Zone Stress comparison strip */}
      <div className="signal-stress-strip">
        <div className="stress-card reports-stress">
          <span className="stress-label">Reports Only</span>
          <div className="stress-val-row">
            <Num value={model.sumR} prov={provSynth} precision={1} unit="h" />
            <span className="stress-sep">/</span>
            <Num value={model.B_REF} prov={getProv('ASSUMPTION', 'CGWB block baseline')} precision={1} unit="m³" />
            <span className="stress-eq">=</span>
            <Num value={model.SOE_reports_pct} prov={provSynth} precision={1} unit="%" />
          </div>
          <Chip variant="ok" size="sm" label={model.tier_reports} />
        </div>

        <div className="stress-card meter-stress">
          <span className="stress-label">Meters Only</span>
          <div className="stress-val-row">
            <Num value={model.sumE} prov={provLive} precision={1} unit="h" />
            <span className="stress-sep">/</span>
            <Num value={model.B_REF} prov={getProv('ASSUMPTION', 'CGWB block baseline')} precision={1} unit="m³" />
            <span className="stress-eq">=</span>
            <Num value={model.SOE_meter_pct} prov={provLive} precision={1} unit="%" />
          </div>
          <Chip variant="critical" size="sm" label={model.tier_meter} />
        </div>

        <div className="stress-card verified-stress">
          <span className="stress-label">Dual-Signal Verified</span>
          <div className="stress-val-row">
            <Num value={model.sumU} prov={provBlend} precision={1} unit="h" />
            <span className="stress-sep">/</span>
            <Num value={model.B_REF} prov={getProv('ASSUMPTION', 'CGWB block baseline')} precision={1} unit="m³" />
            <span className="stress-eq">=</span>
            <Num value={model.SOE_verified_pct} prov={provBlend} precision={1} unit="%" />
          </div>
          <Chip variant="critical" size="sm" label={model.tier_verified} />
        </div>
      </div>

      {/* Small Multiples for Farmers */}
      <div className="signal-cards-grid">
        {model.farmers.map((f) => {
          const isSelected = selectedFarmerId === f.id;
          // Crop need S band based on land area and baseline Kc
          const sMin = f.land * 3.5;
          const sMax = f.land * 5.2;

          return (
            <div
              key={f.id}
              className={`signal-farmer-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedFarmerId(isSelected ? null : f.id)}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
            >
              <div className="farmer-card-header">
                <div className="farmer-title-row">
                  <span className="farmer-badge">
                    <Exempt reason="id">{f.id}</Exempt>
                  </span>
                  <span className="farmer-name">{f.name}</span>
                </div>
                {f.flags.length > 0 ? (
                  f.flags.map((flag) => (
                    <Chip key={flag} variant="review" size="sm" label={flag} />
                  ))
                ) : (
                  <Chip variant="ok" size="sm" label="OK" />
                )}
              </div>

              <div className="signal-bars">
                {/* R bar */}
                <div className="signal-bar-row">
                  <span className="signal-bar-label text-2">R (Report):</span>
                  <div className="signal-bar-track">
                    <div
                      className="signal-bar-fill bar-r"
                      style={{ width: `${Math.min(100, ((f.R ?? 0) / 60) * 100)}%` }}
                    />
                  </div>
                  <Num value={f.R ?? 0} prov={provSynth} precision={1} unit="h" />
                </div>

                {/* E bar */}
                <div className="signal-bar-row">
                  <span className="signal-bar-label text-2">E (Meter):</span>
                  <div className="signal-bar-track">
                    <div
                      className="signal-bar-fill bar-e"
                      style={{ width: `${Math.min(100, ((f.E ?? 0) / 60) * 100)}%` }}
                    />
                  </div>
                  <Num value={f.E ?? 0} prov={provLive} precision={1} unit="h" />
                </div>

                {/* S Band (Crop Satellite Need) */}
                <div className="signal-bar-row">
                  <span className="signal-bar-label text-2">S (Crop Band):</span>
                  <div className="signal-bar-track s-band-track">
                    <div
                      className="signal-band-highlight"
                      style={{
                        left: `${(sMin / 60) * 100}%`,
                        width: `${((sMax - sMin) / 60) * 100}%`,
                      }}
                      title="Estimated physiological crop need from FAO-56 & Sentinel-2"
                    />
                  </div>
                  <span className="s-band-text">
                    <Num value={sMin} prov={getProv('ASSUMPTION', 'FAO-56 Table 12 Kc min')} precision={1} />
                    <span>-</span>
                    <Num value={sMax} prov={getProv('ASSUMPTION', 'FAO-56 Table 12 Kc max')} precision={1} unit="h" />
                  </span>
                </div>
              </div>

              <div className="farmer-card-footer text-2">
                <span>Trust <Num value={f.T} prov={provBlend} precision={2} /></span>
                <span>Demand <Num value={f.U} prov={provBlend} precision={1} unit="h" /></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
