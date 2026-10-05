import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from './store/useStore';
import { fetchDashboardData } from './lib/api';
import { computeTier0, SnapshotData } from './lib/snapshotLoader';
import { MapShell } from './components/MapShell';
import { LayerTree } from './components/LayerTree';
import { FloatingWidget } from './components/FloatingWidget';
import { WorkedAllocationTable } from './components/WorkedAllocationTable';
import { W2SignalBoard } from './components/widgets/W2SignalBoard';
import { W3ZoneStress } from './components/widgets/W3ZoneStress';
import { W4CapProvenance } from './components/widgets/W4CapProvenance';
import { W5AllocationWaterfall } from './components/widgets/W5AllocationWaterfall';
import { W6ObjectGraph } from './components/widgets/W6ObjectGraph';
import { W9MerkleInspector } from './components/widgets/W9MerkleInspector';
import { DrillPresetsBar } from './components/DrillPresetsBar';
import { CommitteeDialog } from './components/CommitteeDialog';
import { CsvDropModal } from './components/CsvDropModal';
import { ObjectInspector } from './components/ObjectInspector';
import { ProveItDrawer } from './components/ProveItDrawer';
import { CommandBar } from './components/CommandBar';
import { WeeklyScrubber } from './components/WeeklyScrubber';
import { HonestyPanel } from './components/HonestyPanel';
import { ColdStartBanner } from './components/ColdStartBanner';
import { Hero } from './components/Hero';
import { Num } from './components/Num';
import { Exempt } from './components/Exempt';
import { Chip, Stat } from './design';
import { Prov } from './lib/prov';

export default function App() {
  const {
    week,
    assumptions,
    verifiedVsReports,
    setVerifiedVsReports,
    lite,
    setHonestyPanelOpen,
    openProveIt,
    setCommandBarOpen,
    farmerOverrides,
    uploadedCsvRows,
    uploadedCsvHash,
    committeeDecisions,
    poolOverride,
  } = useStore();

  // Load dashboard data: snapshot-first with graceful fallback
  const { data: snapshot, isLoading } = useQuery<SnapshotData>({
    queryKey: ['dashboard', 'Zone-A', week],
    queryFn: () => fetchDashboardData('Zone-A', week),
    staleTime: 60_000,
  });

  // Tier-0 client-side TS core math computation
  const model = useMemo(() => {
    if (!snapshot) return null;
    return computeTier0(
      snapshot,
      assumptions,
      verifiedVsReports,
      farmerOverrides,
      uploadedCsvRows,
      uploadedCsvHash,
      committeeDecisions,
      poolOverride
    );
  }, [
    snapshot,
    assumptions,
    verifiedVsReports,
    farmerOverrides,
    uploadedCsvRows,
    uploadedCsvHash,
    committeeDecisions,
    poolOverride,
  ]);


  if (!model) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Loading AquaPulse snapshot...</p>
      </div>
    );
  }

  const provSOE: Prov = {
    kind: 'LIVE',
    source: 'Dual-signal telemetry blend against CGWB B_REF',
    asOf: model.asOf,
    hash: model.hash,
  };

  const provPool: Prov = {
    kind: 'LIVE',
    source: 'Conformal bucket forecast cap pool',
    asOf: model.asOf,
    hash: model.hash,
  };

  const provDemand: Prov = {
    kind: 'SYNTH',
    source: 'Sum of dual-signal farmer demands (U)',
    asOf: model.asOf,
    hash: model.hash,
  };

  const provFloor: Prov = {
    kind: 'ASSUMPTION',
    source: 'Drinking water dignity allocation floor',
    asOf: model.asOf,
  };

  return (
    <div className={`app ${lite ? 'mode-lite' : ''}`}>
      <ColdStartBanner isLoading={isLoading} asOf={model.asOf} />

      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo">💧</div>
          <div>
            <h1 className="brand-title">AquaPulse</h1>
            <span className="brand-subtitle text-2">Groundwater Allocation & Provenance Ledger</span>
          </div>
        </div>

        <div className="header-meta">
          <div className="meta-pill">
            <span className="meta-label text-2">Zone:</span>
            <Exempt reason="id" className="meta-val font-mono">
              {model.zone}
            </Exempt>
          </div>
          <div className="meta-pill">
            <span className="meta-label text-2">Week:</span>
            <Exempt reason="axis-tick" className="meta-val font-mono">
              {model.week}
            </Exempt>
          </div>
          <div className="meta-pill">
            <span className="meta-label text-2">Tier:</span>
            <Chip
              variant={model.tier_verified === 'Over-exploited' ? 'critical' : 'ok'}
              size="sm"
              label={model.tier_verified}
            />
          </div>
        </div>

        <div className="header-actions">
          <button
            className="cmd-bar-trigger-btn"
            onClick={() => setCommandBarOpen(true)}
            title="Open Command Launcher (Ctrl+K)"
          >
            <span>🔍 Command Bar</span>
            <span className="cmd-shortcut font-mono text-2">Ctrl+K</span>
          </button>

          <button
            className="header-prove-btn"
            onClick={() => openProveIt()}
            title="Inspect cryptographic & satellite provenance"
          >
            🛡️ Prove It
          </button>

          <button
            className="header-honesty-btn"
            onClick={() => setHonestyPanelOpen(true)}
            title="Inspect Honesty Panel metrics & assumptions"
          >
            ⚖️ Honesty Panel
          </button>

          <label className="toggle-label" title="Compare self-reported vs dual-signal verified allocations">
            <input
              type="checkbox"
              checked={verifiedVsReports}
              onChange={(e) => setVerifiedVsReports(e.target.checked)}
            />
            <span className="toggle-text">Reports-Only Comparison</span>
          </label>
        </div>
      </header>

      <main className="dashboard-content">
        {/* The Verify Moment: 35s Guided Hero Tour (§8.4) */}
        <Hero model={model} />

        {/* Aquifer High-Level Telemetry Strip (§8.3) */}
        <section className="stats-strip" aria-label="Key Aquifer Metrics">
          <Stat
            label="Zone Stress (SOE)"
            value={model.SOE_verified_pct}
            prov={provSOE}
            unit="%"
            precision={1}
            subtext={<span>Threshold <Exempt reason="axis-tick">100%</Exempt> = Over-exploited</span>}
            badge={
              <Chip
                variant={model.SOE_verified_pct > 100 ? 'critical' : 'ok'}
                size="sm"
                label={model.tier_verified}
              />
            }
          />

          <Stat
            label="Weekly Cap Pool"
            value={model.pool}
            prov={provPool}
            unit="m³"
            precision={1}
            subtext="Calibrated safe-yield envelope"
            badge={<Chip variant="LIVE" size="sm" />}
          />

          <Stat
            label="Verified Total Demand (U)"
            value={model.sumU}
            prov={provDemand}
            unit="h"
            precision={1}
            subtext="Fused from reports & meters"
            badge={<Chip variant="SYNTH" size="sm" />}
          />

          <Stat
            label="Dignity Floor"
            value={assumptions.floor_m3}
            prov={provFloor}
            unit="m³"
            precision={0}
            subtext="Protected domestic allocation"
            badge={<Chip variant="ASSUMPTION" size="sm" />}
          />
        </section>

        {/* S8 Drill Presets & Stress Sandboxes Bar (§8.8 W12, §8.11) */}
        <DrillPresetsBar model={model} />

        {/* Aquifer Full-Bleed Map Visualization & Floating Widgets (§8.5) */}
        <section className="map-section" aria-label="Aquifer Map Visualization">
          <LayerTree />
          <MapShell farmers={model.farmers} />

          {/* Floating Widgets Overlay Canvas */}
          <div className="widgets-overlay-canvas">
            <FloatingWidget id="w1" badge={<Chip variant="LIVE" size="sm" label="Pure TS Core" />}>
              <WorkedAllocationTable model={model} snapshot={snapshot} />
            </FloatingWidget>

            <FloatingWidget id="w2" badge={<Chip variant="LIVE" size="sm" label="Dual-Signal" />}>
              <W2SignalBoard model={model} />
            </FloatingWidget>

            <FloatingWidget id="w3" badge={<Chip variant="LIVE" size="sm" label="SOE Gauge" />}>
              <W3ZoneStress model={model} />
            </FloatingWidget>

            <FloatingWidget id="w4" badge={<Chip variant="SYNTH" size="sm" label="M4 Trajectories" />}>
              <W4CapProvenance model={model} />
            </FloatingWidget>

            <FloatingWidget id="w5" badge={<Chip variant="LIVE" size="sm" label="Waterfall" />}>
              <W5AllocationWaterfall model={model} />
            </FloatingWidget>

            <FloatingWidget id="w6" badge={<Chip variant="ASSUMPTION" size="sm" label="Theis Force Graph" />}>
              <W6ObjectGraph model={model} />
            </FloatingWidget>

            <FloatingWidget id="w9" badge={<Chip variant="LIVE" size="sm" label="Cryptographic Ledger" />}>
              <W9MerkleInspector model={model} />
            </FloatingWidget>

            <FloatingWidget id="inspector" badge={<Chip variant="LIVE" size="sm" label="Selected Telemetry" />}>
              <ObjectInspector model={model} />
            </FloatingWidget>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <WeeklyScrubber />
      </footer>

      {/* Drawers and Overlays */}
      <HonestyPanel />
      <ProveItDrawer />
      <CommandBar model={model} />
      <CommitteeDialog model={model} />
      <CsvDropModal />
    </div>
  );
}

