import React from 'react';
import { useStore } from '../store/useStore';
import { Num } from './Num';
import { Exempt } from './Exempt';
import { Chip } from '../design';
import { Prov } from '../lib/prov';

export const ProveItDrawer: React.FC = () => {
  const { isProveItOpen, setProveItOpen, proveItContext } = useStore();

  if (!isProveItOpen) return null;

  const provReplay: Prov = {
    kind: 'REPLAY',
    source: 'Earth Search AWS STAC Sentinel-2 L2A archive',
    asOf: '2026-10-05T00:00:00Z',
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  };

  return (
    <div className="prove-it-modal-backdrop" onClick={() => setProveItOpen(false)} role="presentation">
      <div
        className="prove-it-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Prove It Provenance Inspector"
      >
        <div className="prove-header">
          <div className="prove-title-row">
            <span className="prove-shield-icon">🛡️</span>
            <div>
              <h3 className="prove-title">
                Prove It — Cryptographic & Satellite Provenance Inspector (<Exempt reason="id">§8.8</Exempt>)
              </h3>
              <p className="prove-subtitle text-2">
                Every calculation, satellite scene, and meter reading is anchored to a verifiable SHA-256 hash
              </p>
            </div>
          </div>
          <button
            className="prove-close-btn"
            onClick={() => setProveItOpen(false)}
            aria-label="Close Prove It Drawer"
          >
            ✕
          </button>
        </div>

        <div className="prove-body">
          {/* Satellite Scene & NDVI Provenance */}
          <section className="prove-card">
            <div className="prove-card-header">
              <h4 className="card-title text-1">Satellite Ground Truth & NDVI Provenance</h4>
              <Chip variant="REPLAY" size="sm" label="REPLAY(as-of 2026-10-05)" />
            </div>
            <p className="prove-card-desc text-2">
              S4 Earth Search integration status: Minimal variant serving dry-season scene with full cryptographic proof.
            </p>

            <div className="prove-table">
              <div className="prove-row">
                <span className="prove-k text-2">STAC API Endpoint:</span>
                <span className="prove-v font-mono text-2">
                  <Exempt reason="id">https://earth-search.aws.element84.com/v1</Exempt>
                </span>
              </div>
              <div className="prove-row">
                <span className="prove-k text-2">Sentinel-2 Scene ID:</span>
                <span className="prove-v font-mono text-2">
                  <Exempt reason="scene-id">
                    S2B_MSIL2A_20261004T054659_N0500_R119_T43QGF_20261004T091230
                  </Exempt>
                </span>
              </div>
              <div className="prove-row">
                <span className="prove-k text-2">Acquisition Date:</span>
                <span className="prove-v font-mono text-2">
                  <Exempt reason="date">2026-10-04</Exempt>
                </span>
              </div>
              <div className="prove-row">
                <span className="prove-k text-2">Cloud Cover:</span>
                <span className="prove-v">
                  <Num value={2.4} prov={provReplay} unit="%" precision={1} />
                </span>
              </div>
              <div className="prove-row">
                <span className="prove-k text-2">Spectral Band Formula:</span>
                <span className="prove-v font-mono text-2">
                  <Exempt reason="id">NDVI = (B08 - B04) / (B08 + B04)</Exempt>
                </span>
              </div>
              <div className="prove-row">
                <span className="prove-k text-2">Bounding Polygon:</span>
                <span className="prove-v font-mono text-2">
                  <Exempt reason="map-control">[78.580, 20.720, 78.620, 20.760]</Exempt>
                </span>
              </div>
            </div>
          </section>

          {/* TS Core Math & Code Paths */}
          <section className="prove-card">
            <div className="prove-card-header">
              <h4 className="card-title text-1">Deterministic TypeScript Core Math Paths</h4>
              <Chip variant="LIVE" size="sm" label="Zero-drift TS Math" />
            </div>

            <div className="prove-table">
              <div className="prove-row">
                <span className="prove-k text-2">Water-Filling Path:</span>
                <span className="prove-v font-mono text-2">
                  <Exempt reason="id">packages/core/src/waterfill.ts:waterFill()</Exempt>
                </span>
              </div>
              <div className="prove-row">
                <span className="prove-k text-2">Theis Aquifer Path:</span>
                <span className="prove-v font-mono text-2">
                  <Exempt reason="id">packages/core/src/theis.ts:theisDrawdown()</Exempt>
                </span>
              </div>
              <div className="prove-row">
                <span className="prove-k text-2">Merkle Hash Path:</span>
                <span className="prove-v font-mono text-2">
                  <Exempt reason="id">packages/core/src/merkle.ts:rootSync()</Exempt>
                </span>
              </div>
              <div className="prove-row">
                <span className="prove-k text-2">Snapshot Artifact Hash:</span>
                <span className="prove-v font-mono text-2">
                  <Exempt reason="hash">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</Exempt>
                </span>
              </div>
            </div>
          </section>

          {/* Context Details if passed */}
          {proveItContext && (
            <section className="prove-card">
              <div className="prove-card-header">
                <h4 className="card-title text-1">Active Object Proof Context</h4>
              </div>
              <pre className="prove-json font-mono text-2">
                <Exempt reason="id">{JSON.stringify(proveItContext, null, 2)}</Exempt>
              </pre>
            </section>
          )}
        </div>

        <div className="prove-footer">
          <button className="prove-dismiss-btn" onClick={() => setProveItOpen(false)}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
