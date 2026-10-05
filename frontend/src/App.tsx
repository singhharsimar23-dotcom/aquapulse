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
import { Num } from './components/Num';
import { Exempt } from './components/Exempt';
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
            <span className="meta-label">Zone:</span>
            <Exempt reason="id" className="meta-val font-mono">{model.zone}</Exempt>
          </div>
          <div className="meta-pill">
            <span className="meta-label">Week:</span>
            <Exempt reason="axis-tick" className="meta-val font-mono">{model.week}</Exempt>
          </div>
          <div className="meta-pill">
            <span className="meta-label">Tier:</span>
            <span className={`tier-badge tier-${model.tier_verified.toLowerCase().replace(' ', '-')}`}>
              {model.tier_verified}
            </span>
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
        <section className="stats-strip" aria-label="Key Aquifer Metrics">
          <div className="stat-card">
            <span className="stat-label text-2">Zone Stress (SOE)</span>
            <div className="stat-value-row">
              <Num value={model.SOE_verified_pct} prov={provSOE} unit="%" precision={1} />
            </div>
            <span className="stat-subtext text-3">Threshold 100% = Over-exploited</span>
          </div>

          <div className="stat-card">
            <span className="stat-label text-2">Weekly Cap Pool</span>
            <div className="stat-value-row">
              <Num value={model.pool} prov={provPool} unit="m³" precision={1} />
            </div>
            <span className="stat-subtext text-3">Calibrated safe-yield envelope</span>
          </div>

          <div className="stat-card">
            <span className="stat-label text-2">Verified Total Demand (U)</span>
            <div className="stat-value-row">
              <Num value={model.sumU} prov={provDemand} unit="h" precision={1} />
            </div>
            <span className="stat-subtext text-3">Fused from reports & meters</span>
          </div>

          <div className="stat-card">
            <span className="stat-label text-2">Dignity Floor</span>
            <div className="stat-value-row">
              <Num value={assumptions.floor_m3} prov={provFloor} unit="m³" precision={0} />
            </div>
            <span className="stat-subtext text-3">Protected domestic allocation</span>
          </div>
        </section>

        <section className="map-section" aria-label="Aquifer Map Visualization">
          <MapShell farmers={model.farmers} />
        </section>

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
