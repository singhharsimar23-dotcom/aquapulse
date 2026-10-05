import React from 'react';
import { ComputedDashboardModel } from '../../lib/snapshotLoader';
import { useStore } from '../../store/useStore';
import { Num } from '../Num';
import { Exempt } from '../Exempt';
import { Prov } from '../../lib/prov';

interface W5AllocationWaterfallProps {
  model: ComputedDashboardModel;
}

export const W5AllocationWaterfall: React.FC<W5AllocationWaterfallProps> = ({ model }) => {
  const { selectedFarmerId, setSelectedFarmerId, assumptions } = useStore();

  const getProv = (kind: 'SYNTH' | 'LIVE' | 'REPLAY' | 'ASSUMPTION' | 'USER', source: string): Prov => ({
    kind,
    source,
    asOf: model.asOf,
    hash: model.hash,
  });

  const provDemand = getProv('SYNTH', 'Sum of dual-signal farmer demands (U)');
  const provPool = getProv('LIVE', 'Conformal bucket forecast cap pool');
  const provAlloc = getProv('LIVE', 'Water-filling algorithm §6.5');
  const provFloor = getProv('ASSUMPTION', 'Domestic drinking water dignity floor');

  const maxVal = Math.max(model.sumU, model.pool, 140);
  const totalReleased = model.farmers.reduce((acc, f) => acc + f.released, 0);
  const totalEscrow = model.farmers.reduce((acc, f) => acc + f.escrow, 0);

  const stages = [
    { label: 'Demand (ΣU)', val: model.sumU, prov: provDemand, color: '#FFB547' },
    { label: 'Cap Pool', val: model.pool, prov: provPool, color: '#00E5FF' },
    { label: 'Allocated', val: model.pool, prov: provAlloc, color: '#3DDC97' },
    { label: 'Released', val: totalReleased, prov: provAlloc, color: '#3DDC97' },
    { label: 'Escrow (Hold)', val: totalEscrow, prov: provAlloc, color: '#FF7B72' },
  ];

  return (
    <div className="w5-waterfall" role="region" aria-label="W5 Allocation Waterfall">
      <div className="waterfall-summary-stages">
        {stages.map((stage) => {
          const heightPct = Math.min(100, (stage.val / maxVal) * 100);
          return (
            <div key={stage.label} className="waterfall-stage-col">
              <div className="stage-val-bubble">
                <Num value={stage.val} prov={stage.prov} precision={1} unit="m³" />
              </div>
              <div className="stage-bar-track">
                <div
                  className="stage-bar-fill"
                  style={{ height: `${heightPct}%`, backgroundColor: stage.color }}
                />
                {/* Dignity floor line under every bar per §8.8 */}
                {assumptions.floor_m3 > 0 && (
                  <div
                    className="waterfall-floor-line"
                    style={{ bottom: `${(assumptions.floor_m3 / maxVal) * 100}%` }}
                    title={`Dignity Floor: ${assumptions.floor_m3} m³`}
                  />
                )}
              </div>
              <span className="stage-label text-2">{stage.label}</span>
            </div>
          );
        })}
      </div>

      <div className="waterfall-farmers-breakdown">
        <h4 className="breakdown-title text-2">
          Farmer Water-Filling Allocations & Dignity Floor Line (<Exempt reason="id">§6.5</Exempt>)
        </h4>
        <div className="farmer-bars-container">
          {model.farmers.map((f) => {
            const isSelected = selectedFarmerId === f.id;
            const barHeightPct = Math.min(100, (f.alloc / 40) * 100);
            const demandHeightPct = Math.min(100, (f.U / 40) * 100);

            return (
              <div
                key={f.id}
                className={`farmer-bar-col ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedFarmerId(isSelected ? null : f.id)}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
              >
                <div className="farmer-bar-track">
                  {/* Total demand phantom outline */}
                  <div
                    className="demand-ghost-bar"
                    style={{ height: `${demandHeightPct}%` }}
                    title={`Requested demand: ${f.U.toFixed(1)} h`}
                  />
                  {/* Released bar */}
                  <div
                    className="released-bar-fill"
                    style={{ height: `${barHeightPct}%` }}
                    title={`Allocated: ${f.alloc.toFixed(1)} h`}
                  />
                  {/* Escrow slice */}
                  {f.escrow > 0 && (
                    <div
                      className="escrow-slice-fill"
                      style={{
                        bottom: `${((f.released) / 40) * 100}%`,
                        height: `${(f.escrow / 40) * 100}%`,
                      }}
                      title={`Held in escrow: ${f.escrow.toFixed(1)} h`}
                    />
                  )}
                  {/* Dignity floor line under every bar per §8.8 */}
                  <div
                    className="dignity-floor-marker"
                    style={{ bottom: `${(f.floor / 40) * 100}%` }}
                    title="Dignity floor line"
                  />
                </div>
                <div className="farmer-bar-label">
                  <span className="farmer-badge">
                    <Exempt reason="id">{f.id}</Exempt>
                  </span>
                  <Num value={f.alloc} prov={provAlloc} precision={1} unit="h" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
