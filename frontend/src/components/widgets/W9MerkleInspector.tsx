import React, { useState } from 'react';
import { ComputedDashboardModel } from '../../lib/snapshotLoader';
import { useStore } from '../../store/useStore';
import { leafSync, rootSync, toHex, fmt6 } from '@aquapulse/core';
import { Num } from '../Num';
import { Exempt } from '../Exempt';
import { Chip } from '../../design';
import { Prov } from '../../lib/prov';

interface W9MerkleInspectorProps {
  model: ComputedDashboardModel;
}

export const W9MerkleInspector: React.FC<W9MerkleInspectorProps> = ({ model }) => {
  const { selectedFarmerId, setSelectedFarmerId } = useStore();
  const [tamperedFarmerId, setTamperedFarmerId] = useState<string | null>(null);
  const [tamperedRoot, setTamperedRoot] = useState<string | null>(null);
  const [tamperDiffText, setTamperDiffText] = useState<string | null>(null);

  const getProv = (kind: 'SYNTH' | 'LIVE' | 'REPLAY' | 'ASSUMPTION' | 'USER', source: string): Prov => ({
    kind,
    source,
    asOf: model.asOf,
    hash: model.hash,
  });

  const originalLeaves = model.farmers.map((f) => {
    const fields = [
      f.id,
      model.zone,
      String(model.week),
      fmt6(f.U),
      fmt6(f.alloc),
      fmt6(f.released),
      fmt6(f.escrow),
      f.flags.join('|'),
    ];
    return {
      id: f.id,
      fields,
      hash: toHex(leafSync(fields)),
    };
  });

  const handleTamper = (targetId: string) => {
    setTamperedFarmerId(targetId);
    // Clone and tamper Farmer target's released hours from X to 99.000000
    const clonedLeaves = originalLeaves.map((l) => {
      if (l.id === targetId) {
        const tamperedFields = [...l.fields];
        const oldVal = tamperedFields[5];
        tamperedFields[5] = '99.000000'; // Tampered released hours
        setTamperDiffText(
          `- Leaf ${targetId} [released]: ${oldVal}\n+ Leaf ${targetId} [released]: 99.000000`
        );
        return leafSync(tamperedFields);
      }
      return leafSync(l.fields);
    });

    const newRoot = toHex(rootSync(clonedLeaves));
    setTamperedRoot(newRoot);
  };

  const handleResetTamper = () => {
    setTamperedFarmerId(null);
    setTamperedRoot(null);
    setTamperDiffText(null);
  };

  return (
    <div className="w9-merkle-inspector" role="region" aria-label="W9 Merkle Inspector">
      <div className="merkle-root-card">
        <div className="root-meta-row">
          <span className="root-title">Merkle Root (Current State)</span>
          <Chip variant="LIVE" size="sm" label="WebCrypto SHA-256" />
        </div>
        <div className="root-hash-box">
          <Exempt reason="hash" className="root-hash-text font-mono">
            {model.merkleRoot}
          </Exempt>
        </div>
      </div>

      {/* Tamper Simulation Card */}
      <div className="tamper-control-panel">
        <div className="tamper-actions-row">
          <span className="tamper-label text-2">Cryptographic Tamper Test:</span>
          {tamperedRoot ? (
            <button className="reset-tamper-btn" onClick={handleResetTamper}>
              ↺ Reset Ledger
            </button>
          ) : (
            <button
              className="tamper-trigger-btn"
              onClick={() => handleTamper('C')}
              title="Tamper Farmer C allocation on a cloned tree"
            >
              ⚠️ Tamper on a clone (Farmer C)
            </button>
          )}
        </div>

        {tamperedRoot && (
          <div className="tamper-alert-box" role="alert">
            <div className="alert-badge text-critical">❌ ROOT MISMATCH: TAMPER DETECTED</div>
            <div className="tamper-diff-view">
              <pre className="font-mono text-diff">{tamperDiffText}</pre>
            </div>
            <div className="tampered-root-box font-mono">
              <span className="tamper-root-label">Tampered Root:</span>
              <Exempt reason="hash">{tamperedRoot}</Exempt>
            </div>
          </div>
        )}
      </div>

      {/* Leaf Receipts */}
      <div className="merkle-leaves-section">
        <h4 className="leaves-title text-2">
          Farmer Allocation Leaf Receipts (<Exempt reason="id">§6.8</Exempt>)
        </h4>
        <div className="leaves-list">
          {originalLeaves.map((leaf) => {
            const isSelected = selectedFarmerId === leaf.id;
            const isTampered = tamperedFarmerId === leaf.id;

            return (
              <div
                key={leaf.id}
                className={`leaf-item ${isSelected ? 'leaf-selected' : ''} ${
                  isTampered ? 'leaf-tampered' : ''
                }`}
                onClick={() => setSelectedFarmerId(isSelected ? null : leaf.id)}
                role="button"
                tabIndex={0}
              >
                <div className="leaf-header">
                  <span className="leaf-badge">
                    <Exempt reason="id">Leaf {leaf.id}</Exempt>
                  </span>
                  <Exempt reason="hash" className="leaf-hash font-mono text-2">
                    {leaf.hash.slice(0, 16)}...
                  </Exempt>
                  {isTampered && <Chip variant="critical" size="sm" label="TAMPERED" />}
                </div>
                <div className="leaf-payload font-mono text-2">
                  <span title="Payload: [id, zone, week, U, alloc, released, escrow, flags]">
                    {leaf.fields.join(' | ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
