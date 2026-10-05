/**
 * Provenance enforcement and data structures per AQUAPULSE_V9_2_LEAN.md §8.6 & §8.3
 */

export type ProvKind = 'LIVE' | 'REPLAY' | 'SYNTH' | 'ASSUMPTION' | 'USER';

export type ProvReason =
  | 'date'
  | 'version'
  | 'axis-tick'
  | 'scene-id'
  | 'hash'
  | 'map-control'
  | 'id';

export interface Prov {
  kind: ProvKind;
  source: string;
  asOf: string;
  hash?: string;
  url?: string;
}

export const VALID_PROV_KINDS: readonly ProvKind[] = [
  'LIVE',
  'REPLAY',
  'SYNTH',
  'ASSUMPTION',
  'USER',
] as const;

export const VALID_PROV_REASONS: readonly ProvReason[] = [
  'date',
  'version',
  'axis-tick',
  'scene-id',
  'hash',
  'map-control',
  'id',
] as const;

export function isProvKind(value: unknown): value is ProvKind {
  return typeof value === 'string' && (VALID_PROV_KINDS as readonly string[]).includes(value);
}

export function isProvReason(value: unknown): value is ProvReason {
  return typeof value === 'string' && (VALID_PROV_REASONS as readonly string[]).includes(value);
}

export const PROV_META: Record<ProvKind, { color: string; letter: string; description: string; borderStyle?: string }> = {
  LIVE: {
    color: '#4CC9F0',
    letter: 'L',
    description: 'Direct measurement from active sensor or meter telemetry',
  },
  REPLAY: {
    color: '#7C93B5',
    letter: 'R',
    description: 'Archived historical telemetry with known timestamp and hash',
  },
  SYNTH: {
    color: '#9B8CFF',
    letter: 'S',
    description: 'Synthetic baseline generated from reproducible seed and rules',
    borderStyle: 'dashed',
  },
  ASSUMPTION: {
    color: '#FFB547',
    letter: 'A',
    description: 'Configurable policy/engineering assumption editable in Honesty Panel',
    borderStyle: 'solid',
  },
  USER: {
    color: '#F0A6FF',
    letter: 'U',
    description: 'User-provided CSV file or interactive input parameter',
  },
};
