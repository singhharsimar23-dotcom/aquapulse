/**
 * Typed API Client for AquaPulse
 * Gracefully handles waking server / cold start and falls back to snapshot.json
 */

import { SnapshotData, loadSnapshot } from './snapshotLoader';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export interface CapResponse {
  zone: string;
  week: number;
  cap: number;
  pool: number;
  tier: string;
  source: string;
  asOf: string;
}

export async function fetchZoneCap(zone: string, week: number): Promise<CapResponse> {
  const res = await fetch(`${API_BASE}/cap/${zone}/${week}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`API error fetching cap: ${res.status}`);
  }
  return (await res.json()) as CapResponse;
}

export async function fetchDashboardData(zone: string, week: number): Promise<SnapshotData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${API_BASE}/snapshot/${zone}/${week}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return (await res.json()) as SnapshotData;
    }
  } catch {
    // API unavailable, timed out, or blocked: fallback to snapshot-first loader
  }

  return loadSnapshot();
}
