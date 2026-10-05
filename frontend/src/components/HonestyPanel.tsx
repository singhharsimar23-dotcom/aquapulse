import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Exempt } from './Exempt';

/**
 * Honesty Panel Skeleton per AQUAPULSE_V9_2_LEAN.md §8.6, §8.8 W11, S6:
 * Counts data-prov kinds and data-prov-exempt in DOM, provides editable assumptions,
 * and displays the AI vs Rules vs Statistics breakdown.
 */
export const HonestyPanel: React.FC = () => {
  const { isHonestyPanelOpen, setHonestyPanelOpen, assumptions, setAssumption, resetAssumptions } = useStore();
  const [counts, setCounts] = useState<Record<string, number>>({
    LIVE: 0,
    REPLAY: 0,
    SYNTH: 0,
    ASSUMPTION: 0,
    USER: 0,
    exempt: 0,
  });

  useEffect(() => {
    if (!isHonestyPanelOpen) return;

    const updateCounts = () => {
      const c = {
        LIVE: document.querySelectorAll('[data-prov="LIVE"]').length,
        REPLAY: document.querySelectorAll('[data-prov="REPLAY"]').length,
        SYNTH: document.querySelectorAll('[data-prov="SYNTH"]').length,
        ASSUMPTION: document.querySelectorAll('[data-prov="ASSUMPTION"]').length,
        USER: document.querySelectorAll('[data-prov="USER"]').length,
        exempt: document.querySelectorAll('[data-prov-exempt]').length,
      };
      setCounts(c);
    };

    updateCounts();
    const interval = setInterval(updateCounts, 1000);
    return () => clearInterval(interval);
  }, [isHonestyPanelOpen]);

  if (!isHonestyPanelOpen) {
    return (
      <button
        className="honesty-panel-toggle"
        onClick={() => setHonestyPanelOpen(true)}
        aria-label="Open Honesty Panel"
      >
        <span className="dot-indicator" />
        Honesty Panel
      </button>
    );
  }

  return (
    <aside className="honesty-panel" role="complementary" aria-label="Honesty and Provenance Panel">
      <div className="panel-header">
        <h2 className="panel-title">Honesty Panel (§8.6 / W11)</h2>
        <button
          className="panel-close-btn"
          onClick={() => setHonestyPanelOpen(false)}
          aria-label="Close Honesty Panel"
        >
          ✕
        </button>
      </div>

      <section className="panel-section">
        <h3>Active DOM Provenance Counts</h3>
        <div className="prov-counts-grid">
          <div className="count-pill prov-live">
            <span className="kind-tag">LIVE (L)</span>
            <Exempt reason="axis-tick" className="count-num font-mono">{counts.LIVE}</Exempt>
          </div>
          <div className="count-pill prov-replay">
            <span className="kind-tag">REPLAY (R)</span>
            <Exempt reason="axis-tick" className="count-num font-mono">{counts.REPLAY}</Exempt>
          </div>
          <div className="count-pill prov-synth">
            <span className="kind-tag">SYNTH (S)</span>
            <Exempt reason="axis-tick" className="count-num font-mono">{counts.SYNTH}</Exempt>
          </div>
          <div className="count-pill prov-assumption">
            <span className="kind-tag">ASSUMPTION (A)</span>
            <Exempt reason="axis-tick" className="count-num font-mono">{counts.ASSUMPTION}</Exempt>
          </div>
          <div className="count-pill prov-user">
            <span className="kind-tag">USER (U)</span>
            <Exempt reason="axis-tick" className="count-num font-mono">{counts.USER}</Exempt>
          </div>
          <div className="count-pill prov-exempt">
            <span className="kind-tag">EXEMPT (Reasoned)</span>
            <Exempt reason="axis-tick" className="count-num font-mono">{counts.exempt}</Exempt>
          </div>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-head-with-action">
          <h3>Editable Engineering Assumptions</h3>
          <button className="reset-btn" onClick={resetAssumptions}>Reset Defaults</button>
        </div>
        <div className="assumption-inputs">
          <label className="input-group">
            <span className="input-label">Lambda Max (λ_max)</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={assumptions.lambda_max}
              onChange={(e) => setAssumption('lambda_max', parseFloat(e.target.value) || 0)}
              className="font-mono input-field"
            />
          </label>
          <label className="input-group">
            <span className="input-label">Review Mismatch Threshold</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={assumptions.review_mismatch}
              onChange={(e) => setAssumption('review_mismatch', parseFloat(e.target.value) || 0)}
              className="font-mono input-field"
            />
          </label>
          <label className="input-group">
            <span className="input-label">Drinking Water Floor (m³/wk)</span>
            <input
              type="number"
              step="1"
              min="0"
              value={assumptions.floor_m3}
              onChange={(e) => setAssumption('floor_m3', parseFloat(e.target.value) || 0)}
              className="font-mono input-field"
            />
          </label>
          <label className="input-group">
            <span className="input-label">Well Pump Power (P_rated, kW)</span>
            <input
              type="number"
              step="0.5"
              min="1"
              value={assumptions.P_rated}
              onChange={(e) => setAssumption('P_rated', parseFloat(e.target.value) || 0)}
              className="font-mono input-field"
            />
          </label>
        </div>
      </section>

      <section className="panel-section">
        <h3>AI vs Rules vs Statistics (§8.8 W11)</h3>
        <ul className="breakdown-list">
          <li>
            <strong>Deterministic Rules:</strong> Trust formula, missing-data rules (null ≠ 0),
            water-filling allocation, escrow hold, tier labels, review state machine.
          </li>
          <li>
            <strong>Statistics & Physics:</strong> Beta reliability tracker, aquifer bucket balance,
            conformal ACI margin, Theis drawdown superposition.
          </li>
          <li>
            <strong>Machine Learning:</strong> Sentinel-2 classical image thresholding (NDVI),
            quantile forecaster (M1).
          </li>
          <li>
            <strong>LLM:</strong> Grounded explanations only with numeric assertion check; never arbitrates allocation.
          </li>
        </ul>
      </section>
    </aside>
  );
};
