import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from './store/useStore';
import { fetchDashboardData } from './lib/api';
import { computeTier0, SnapshotData } from './lib/snapshotLoader';
import { MapShell } from './components/MapShell';
import { WorkedAllocationTable } from './components/WorkedAllocationTable';
import { WeeklyScrubber } from './components/WeeklyScrubber';
import { HonestyPanel } from './components/HonestyPanel';
import { ColdStartBanner } from './components/ColdStartBanner';
import { Hero } from './components/Hero';
import { Num } from './components/Num';
import { Exempt } from './components/Exempt';
import { Panel, Chip, Stat } from './design';
import { Prov } from './lib/prov';

export default function App() {
  const {
    week,
    assumptions,
    verifiedVsReports,
    setVerifiedVsReports,
    lite,
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
    return computeTier0(snapshot, assumptions, verifiedVsReports);
  }, [snapshot, assumptions, verifiedVsReports]);

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
            <Exempt reason="id" className="meta-val font-mono">{model.zone}</Exempt>
          </div>
          <div className="meta-pill">
            <span className="meta-label text-2">Week:</span>
            <Exempt reason="axis-tick" className="meta-val font-mono">{model.week}</Exempt>
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

        {/* Aquifer Map Visualization */}
        <section className="map-section" aria-label="Aquifer Map Visualization">
          <MapShell farmers={model.farmers} />
        </section>

        {/* Allocation Vectors */}
        <section className="table-section" aria-label="Allocation Vectors">
          <WorkedAllocationTable model={model} />
        </section>
      </main>

      <footer className="app-footer">
        <WeeklyScrubber />
      </footer>

      <HonestyPanel />
    </div>
  );
}
