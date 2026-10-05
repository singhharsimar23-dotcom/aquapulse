import React from 'react';
import { useStore } from '../store/useStore';
import { ComputedDashboardModel } from '../lib/snapshotLoader';
import { Num } from './Num';
import { Exempt } from './Exempt';
import { Prov } from '../lib/prov';
import { Chip } from '../design';

interface CommitteeDialogProps {
  model: ComputedDashboardModel;
}

export const CommitteeDialog: React.FC<CommitteeDialogProps> = ({ model }) => {
  const {
    isCommitteeModalOpen,
    setCommitteeModalOpen,
    committeeFarmerId,
    setCommitteeDecision,
    resetCommitteeDecisions,
    committeeDecisions,
  } = useStore();

  if (!isCommitteeModalOpen) return null;

  const targetId = committeeFarmerId || 'C';
  const farmer =
    model.farmers.find(
      (f) => f.id === targetId || f.id === `F-${targetId}` || f.id.endsWith(targetId)
    ) || model.farmers[2] || model.farmers[0];

  const currentDecision =
    committeeDecisions[farmer.id] ||
    committeeDecisions[farmer.id.replace('F-', '')];

  const prov = (source: string): Prov => ({
    kind: 'LIVE',
    source,
    asOf: model.asOf,
    hash: model.hash,
  });

  const handleConfirm = () => {
    setCommitteeDecision(farmer.id, 'CONFIRMED');
    setCommitteeDecision(farmer.id.replace('F-', ''), 'CONFIRMED');
  };

  const handleDismiss = () => {
    setCommitteeDecision(farmer.id, 'DISMISSED');
    setCommitteeDecision(farmer.id.replace('F-', ''), 'DISMISSED');
  };

  const handleReset = () => {
    resetCommitteeDecisions();
  };

  return (
    <div
      className="command-bar-backdrop"
      onClick={() => setCommitteeModalOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Village Water Committee Hearing"
    >
      <div
        className="committee-dialog-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-icon">⚖️</span>
            <div>
              <h2 className="modal-title">Village Water Committee Hearing (<Exempt reason="id">§6.5</Exempt>)</h2>
              <span className="text-2">Democratic Human-in-the-Loop Dispute Arbitration</span>
            </div>
          </div>
          <button
            className="modal-close-btn"
            onClick={() => setCommitteeModalOpen(false)}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="committee-dialog-body">
          {/* Invariant Alert Banner */}
          <div className="governance-invariant-box">
            <span className="invariant-title">🏛️ Constitutional Invariant (§A):</span>
            <p className="invariant-text text-2">
              <strong>Signals flag, never auto-cut.</strong> Disputed water is escrowed (held), never removed.
              Only a human <code>CONFIRMED</code> decision lowers an allocation (written to the Merkle ledger).
              The smart meter is a second opinion, not proof.
            </p>
          </div>

          {/* Farmer Case Summary */}
          <div className="dispute-case-card">
            <div className="case-farmer-header">
              <span className="farmer-badge font-mono">
                <Exempt reason="id">{farmer.id}</Exempt>
              </span>
              <h3 className="case-farmer-name">{farmer.name}</h3>
              <Chip
                variant={currentDecision ? 'ok' : farmer.escrow > 0 ? 'review' : 'ok'}
                size="sm"
                label={currentDecision ? `DECIDED: ${currentDecision}` : farmer.escrow > 0 ? 'HELD IN ESCROW' : 'IN COMPLIANCE'}
              />
            </div>

            <div className="case-metrics-grid">
              <div className="case-metric">
                <span className="text-2">Self-Reported (R):</span>
                <Num value={farmer.R ?? 0} prov={prov('Farmer self-report register')} precision={1} unit="h" />
              </div>
              <div className="case-metric">
                <span className="text-2">Feeder Smart Meter (E):</span>
                <Num value={farmer.E ?? 0} prov={prov('DISCOM feeder telemetry')} precision={1} unit="h" />
              </div>
              <div className="case-metric">
                <span className="text-2">Discrepancy (Δ):</span>
                <span className="text-review font-mono">
                  {Math.abs((farmer.R ?? 0) - (farmer.E ?? 0)).toFixed(1)} h
                </span>
              </div>
              <div className="case-metric">
                <span className="text-2">Water-Filled Alloc:</span>
                <Num value={farmer.alloc} prov={prov('Water-filling allocation')} precision={2} unit="h" />
              </div>
              <div className="case-metric">
                <span className="text-2">Released (Safe):</span>
                <Num value={farmer.released} prov={prov('Released unconditionally')} precision={2} unit="h" />
              </div>
              <div className="case-metric">
                <span className="text-2">Held in Escrow:</span>
                <Num value={farmer.escrow} prov={prov('Escrow split §6.5')} precision={4} unit="h" />
              </div>
            </div>
          </div>

          {/* Decision Outcome status if already decided */}
          {currentDecision && (
            <div className="decision-outcome-banner">
              <strong>Recorded Committee Verdict: </strong>
              <span className={currentDecision === 'CONFIRMED' ? 'text-review' : 'text-ok'}>
                {currentDecision}
              </span>
              {currentDecision === 'CONFIRMED' && (
                <div className="text-2 mt-1">
                  Demand clamped to min(R, E) = {Math.min(farmer.R ?? 0, farmer.E ?? 0).toFixed(1)} h.
                  Unused pool water preserved for aquifer: <Num value={model.unusedPool ?? 14.1053} prov={prov('Unused pool conservation')} precision={4} unit="m³" />
                </div>
              )}
              {currentDecision === 'DISMISSED' && (
                <div className="text-2 mt-1">
                  Dispute dismissed. Full escrow released to farmer without penalty.
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="committee-actions">
            <button
              className="confirm-btn"
              onClick={handleConfirm}
              title="Confirm overdraw: clamp demand to min(R,E), rerun water-fill, and return unused water to pool"
            >
              🔨 CONFIRM (Clamp Demand & Re-run Waterfill)
            </button>

            <button
              className="dismiss-btn"
              onClick={handleDismiss}
              title="Dismiss complaint: release all held escrow to farmer"
            >
              🤝 DISMISS (Release Escrow in Full)
            </button>

            {currentDecision && (
              <button className="reset-decision-btn" onClick={handleReset} title="Reset to pending review state">
                ↺ Reset Decision
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
