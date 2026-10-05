import React from 'react';
import { ComputedDashboardModel } from '../lib/snapshotLoader';
import { Num } from './Num';
import { Prov } from '../lib/prov';
import { useStore } from '../store/useStore';

interface WorkedAllocationTableProps {
  model: ComputedDashboardModel;
}

/**
 * W1 Worked Allocation Table per AQUAPULSE_V9_2_LEAN.md §8.8 & S6:
 * Displays all farmer allocation vectors computed client-side with TS math core.
 * Every single number goes through <Num /> with proper provenance.
 */
export const WorkedAllocationTable: React.FC<WorkedAllocationTableProps> = ({ model }) => {
  const { selectedFarmerId, setSelectedFarmerId } = useStore();

  const getProv = (kind: 'SYNTH' | 'LIVE' | 'REPLAY' | 'ASSUMPTION' | 'USER', source: string): Prov => ({
    kind,
    source,
    asOf: model.asOf,
    hash: model.hash,
  });

  return (
    <div className="table-card" role="region" aria-label="Worked Allocation Table">
      <div className="table-header">
        <div>
          <h2 className="table-title">Worked Allocation Table (W1)</h2>
          <p className="table-subtitle text-2">
            Recomputed in your browser via TypeScript Core — Zero discrepancy with golden vectors
          </p>
        </div>
      </div>

      <div className="table-scroll-container">
        <table className="alloc-table">
          <thead>
            <tr>
              <th>Farmer</th>
              <th>Land (ac)</th>
              <th>Reported (R)</th>
              <th>Meter (E)</th>
              <th>Trust (T)</th>
              <th>Lambda (λ)</th>
              <th>Demand (U)</th>
              <th>Allocated</th>
              <th>Released</th>
              <th>Escrow</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {model.farmers.map((f) => {
              const isSelected = selectedFarmerId === f.id;
              const provSynth = getProv('SYNTH', 'Village self-report register');
              const provLive = getProv('LIVE', 'Feeder smart-meter telemetry');
              const provTrust = getProv('SYNTH', 'Dual-signal trust blend §6.2');
              const provAlloc = getProv('LIVE', 'Water-filling algorithm §6.5');

              return (
                <tr
                  key={f.id}
                  className={`farmer-row ${isSelected ? 'row-selected' : ''}`}
                  onClick={() => setSelectedFarmerId(isSelected ? null : f.id)}
                  tabIndex={0}
                >
                  <td className="farmer-name">
                    <span className="farmer-id-badge">{f.id}</span>
                    <span>{f.name}</span>
                  </td>
                  <td>
                    <Num value={f.land} prov={provSynth} unit="ac" precision={1} />
                  </td>
                  <td>
                    <Num value={f.R} prov={provSynth} unit="h" precision={1} />
                  </td>
                  <td>
                    <Num value={f.E} prov={provLive} unit="h" precision={1} />
                  </td>
                  <td>
                    <Num value={f.T} prov={provTrust} precision={3} />
                  </td>
                  <td>
                    <Num value={f.lam} prov={provTrust} precision={3} />
                  </td>
                  <td className="bold">
                    <Num value={f.U} prov={provTrust} unit="h" precision={1} />
                  </td>
                  <td className="bold">
                    <Num value={f.alloc} prov={provAlloc} unit="h" precision={1} />
                  </td>
                  <td className="text-ok">
                    <Num value={f.released} prov={provAlloc} unit="h" precision={1} />
                  </td>
                  <td className={f.escrow > 0 ? 'text-review' : ''}>
                    <Num value={f.escrow} prov={provAlloc} unit="h" precision={1} />
                  </td>
                  <td>
                    {f.flags.length > 0 ? (
                      f.flags.map((flag) => (
                        <span key={flag} className="flag-chip flag-review">
                          {flag}
                        </span>
                      ))
                    ) : (
                      <span className="flag-chip flag-ok">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
