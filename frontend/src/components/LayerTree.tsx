import React from 'react';
import { useStore, LayerVisibility } from '../store/useStore';
import { Chip } from '../design';
import { Exempt } from './Exempt';

export const LayerTree: React.FC = () => {
  const { layerVisibility, toggleLayer, setBasemap } = useStore();

  const layers: {
    key: keyof Omit<LayerVisibility, 'basemap'>;
    name: string;
    chipVariant: 'LIVE' | 'REPLAY' | 'SYNTH' | 'ASSUMPTION';
    asOf: string;
    section: string;
  }[] = [
    { key: 'ndvi', name: 'Zone NDVI Raster', chipVariant: 'REPLAY', asOf: '2026-10-04', section: '§8.5' },
    { key: 'cones', name: 'Theis Cones of Depression', chipVariant: 'ASSUMPTION', asOf: '2026-10-05', section: '§6.6' },
    { key: 'wells', name: 'Pumping Wells & Flags', chipVariant: 'LIVE', asOf: '2026-10-05', section: '§8.5' },
    { key: 'interference', name: 'Mutual Interference Arcs', chipVariant: 'ASSUMPTION', asOf: '2026-10-05', section: '§6.6' },
    { key: 'columns', name: '3D Pumping Columns', chipVariant: 'LIVE', asOf: '2026-10-05', section: '§8.5' },
    { key: 'gibsContext', name: 'NASA GIBS Satellite Context', chipVariant: 'REPLAY', asOf: '2026-10-04', section: '§8.5' },
    { key: 'feeder', name: 'DISCOM Feeder Network', chipVariant: 'SYNTH', asOf: '2026-10-05', section: '§8.5' },
  ];

  return (
    <div className="left-rail-layer-tree" role="region" aria-label="Map Layers Tree">
      <div className="layer-tree-header">
        <h3 className="layer-tree-title">
          Map Layers (<Exempt reason="id">§8.5</Exempt>)
        </h3>
      </div>

      {/* Layer 1: Basemap switcher */}
      <div className="layer-tree-group">
        <div className="group-title-row">
          <span className="group-title"><Exempt reason="id">1.</Exempt> Basemap Engine</span>
          <Chip variant="LIVE" size="sm" />
        </div>
        <div className="basemap-chips">
          {(['liberty', 'esri', 'gibs', 'dark'] as const).map((bm) => (
            <button
              key={bm}
              className={`bm-pill ${layerVisibility.basemap === bm ? 'active' : ''}`}
              onClick={() => setBasemap(bm)}
            >
              <Exempt reason="id">{bm.toUpperCase()}</Exempt>
            </button>
          ))}
        </div>
      </div>

      {/* Layers 2 to 8 */}
      <div className="layer-tree-list">
        {layers.map((l, idx) => {
          const isChecked = layerVisibility[l.key];
          return (
            <div key={l.key} className="layer-tree-item">
              <label className="layer-checkbox-label">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleLayer(l.key)}
                />
                <span className="layer-name">
                  <Exempt reason="id">{idx + 2}. </Exempt>
                  {l.name.includes('3D') ? (
                    <>
                      <Exempt reason="version">3D</Exempt>
                      {l.name.replace('3D', '')}
                    </>
                  ) : (
                    l.name
                  )}
                </span>
              </label>

              <div className="layer-item-meta">
                <Chip variant={l.chipVariant} size="sm" />
                <span className="layer-asof text-2 font-mono">
                  <Exempt reason="date">{l.asOf}</Exempt>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
