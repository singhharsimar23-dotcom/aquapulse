import React from 'react';
import { ComputedDashboardModel } from '../lib/snapshotLoader';
import { useStore } from '../store/useStore';
import { theisConeRadius, theisDrawdown } from '@aquapulse/core';
import { Num } from './Num';
import { Exempt } from './Exempt';
import { Chip } from '../design';
import { Prov } from '../lib/prov';

interface ObjectInspectorProps {
  model: ComputedDashboardModel;
}

export const ObjectInspector: React.FC<ObjectInspectorProps> = ({ model }) => {
  const { selectedFarmerId, setSelectedFarmerId, assumptions, openProveIt } = useStore();

  const getProv = (kind: 'SYNTH' | 'LIVE' | 'REPLAY' | 'ASSUMPTION' | 'USER', source: string): Prov => ({
    kind,
    source,
    asOf: model.asOf,
    hash: model.hash,
  });

  const selectedFarmer = model.farmers.find((f) => f.id === selectedFarmerId);

  if (!selectedFarmer) {
    return (
      <div className="object-inspector empty-state" role="region" aria-label="Object Inspector">
        <div className="inspector-placeholder">
          <span className="placeholder-icon">🔍</span>
          <p className="placeholder-text">Select a farmer, well, or map entity to inspect provenance & telemetry</p>
          <div className="zone-quick-summary">
            <span className="summary-title text-2">Active Zone Summary:</span>
            <div className="summary-row">
              <span className="text-2">Zone:</span>
              <span className="font-mono"><Exempt reason="id">{model.zone}</Exempt> (Wardha)</span>
            </div>
            <div className="summary-row">
              <span className="text-2">Aquifer Transmissivity (T):</span>
              <Num value={assumptions.T_m2d} prov={getProv('ASSUMPTION', 'Deccan basalt transmissivity §6.6')} precision={1} unit="m²/d" />
            </div>
            <div className="summary-row">
              <span className="text-2">Storativity (S):</span>
              <Num value={assumptions.S_storativity} prov={getProv('ASSUMPTION', 'Deccan basalt storativity §6.6')} precision={3} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compute Theis cone radius for selected farmer's well
  const coneRadius = theisConeRadius(
    selectedFarmer.Q * selectedFarmer.U,
    assumptions.T_m2d ?? 45.0,
    assumptions.S_storativity ?? 0.005,
    7,
    assumptions.s_thresh ?? 0.1
  );

  return (
    <div className="object-inspector" role="region" aria-label={`Inspector: Farmer ${selectedFarmer.id}`}>
      <div className="inspector-header">
        <div className="header-left">
          <span className="inspector-badge">
            <Exempt reason="id">{selectedFarmer.id}</Exempt>
          </span>
          <h3 className="inspector-name">{selectedFarmer.name}</h3>
        </div>
        <button
          className="inspector-close-btn"
          onClick={() => setSelectedFarmerId(null)}
          title="Deselect"
          aria-label="Close inspector"
        >
          ✕
        </button>
      </div>

      <div className="inspector-scroll">
        {/* Core Allocation Details */}
        <section className="inspector-section">
          <h4 className="section-title text-2">Allocation Vectors (<Exempt reason="id">W1</Exempt>)</h4>
          <div className="prop-grid">
            <div className="prop-item">
              <span className="prop-k text-2">Reported (R):</span>
              <Num value={selectedFarmer.R ?? 0} prov={getProv('SYNTH', 'Village register')} precision={1} unit="h" />
            </div>
            <div className="prop-item">
              <span className="prop-k text-2">Meter (E):</span>
              <Num value={selectedFarmer.E ?? 0} prov={getProv('LIVE', 'Feeder telemetry')} precision={1} unit="h" />
            </div>
            <div className="prop-item">
              <span className="prop-k text-2">Trust (T):</span>
              <Num value={selectedFarmer.T} prov={getProv('SYNTH', 'Dual-signal trust §6.2')} precision={3} />
            </div>
            <div className="prop-item">
              <span className="prop-k text-2">Demand (U):</span>
              <Num value={selectedFarmer.U} prov={getProv('SYNTH', 'Verified demand §6.2')} precision={1} unit="h" />
            </div>
            <div className="prop-item">
              <span className="prop-k text-2">Allocated:</span>
              <Num value={selectedFarmer.alloc} prov={getProv('LIVE', 'Water-filling algorithm §6.5')} precision={2} unit="h" />
            </div>
            <div className="prop-item">
              <span className="prop-k text-2">Released:</span>
              <Num value={selectedFarmer.released} prov={getProv('LIVE', 'Water-filling algorithm §6.5')} precision={2} unit="h" />
            </div>
            <div className="prop-item">
              <span className="prop-k text-2">Escrow:</span>
              <Num value={selectedFarmer.escrow} prov={getProv('LIVE', 'Water-filling algorithm §6.5')} precision={2} unit="h" />
            </div>
            <div className="prop-item">
              <span className="prop-k text-2">Status:</span>
              <div>
                {selectedFarmer.flags.length > 0 ? (
                  selectedFarmer.flags.map((f) => (
                    <Chip key={f} variant="review" size="sm" label={f} />
                  ))
                ) : (
                  <Chip variant="ok" size="sm" label="OK" />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Aquifer Physics & Theis Interference (§6.6) */}
        <section className="inspector-section">
          <h4 className="section-title text-2">Theis Cone & Interference (<Exempt reason="id">§6.6</Exempt>)</h4>
          <div className="prop-grid">
            <div className="prop-item">
              <span className="prop-k text-2">Drawdown Radius (s=0.1m):</span>
              <Num value={coneRadius} prov={getProv('ASSUMPTION', 'Theis bisection §6.6')} precision={1} unit="m" />
            </div>
            <div className="prop-item">
              <span className="prop-k text-2">Discharge Q:</span>
              <Num value={selectedFarmer.Q} prov={getProv('LIVE', 'Pump rating')} precision={1} unit="m³/h" />
            </div>
            <div className="prop-item">
              <span className="prop-k text-2">Volume Pumped:</span>
              <Num value={selectedFarmer.Q * selectedFarmer.U} prov={getProv('SYNTH', 'Weekly total')} precision={1} unit="m³" />
            </div>
            <div className="prop-item">
              <span className="prop-k text-2">Coordinates:</span>
              <span className="prop-v font-mono text-2">
                <Exempt reason="map-control">{selectedFarmer.coords.join(', ')}</Exempt>
              </span>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="inspector-footer">
          {selectedFarmer.escrow > 0 && (
            <button
              className="committee-trigger-btn"
              onClick={() => useStore.getState().setCommitteeModalOpen(true, selectedFarmer.id)}
              style={{
                background: 'rgba(255, 181, 71, 0.15)',
                border: '1px solid #ffb547',
                color: '#ffb547',
                padding: '0.45rem 0.8rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.78rem',
                marginBottom: '0.5rem',
                width: '100%',
              }}
            >
              ⚖️ Open Village Committee Hearing (§6.5)
            </button>
          )}
          <button
            className="prove-it-trigger-btn"
            onClick={() => openProveIt({ farmer: selectedFarmer })}
          >
            🛡️ Prove It (Inspect Full Provenance)
          </button>
        </div>
      </div>
    </div>
  );
};

