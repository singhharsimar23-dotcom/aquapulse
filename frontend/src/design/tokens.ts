/**
 * Design Tokens per AQUAPULSE_V9_2_LEAN.md §8.3
 */
export const TOKENS = {
  colors: {
    void: '#07090D',
    surface1: '#0E1218',
    surface2: '#151B24',
    surface3: '#1D2530',
    hairline: 'rgba(255, 255, 255, 0.08)',
    hairlineStrong: 'rgba(255, 255, 255, 0.16)',
    text1: '#E8EDF4',
    text2: '#9AA7B8',
    text3: '#6B7788',
    ok: '#3DDC97',
    review: '#FFB547',
    critical: '#FF5D5D',
    focus: '#4C90F0',
  },
  prov: {
    LIVE: { color: '#4CC9F0', letter: 'L', label: 'Live telemetry' },
    REPLAY: { color: '#7C93B5', letter: 'R', label: 'Historical replay' },
    SYNTH: { color: '#9B8CFF', letter: 'S', label: 'Synthetic model' },
    ASSUMPTION: { color: '#FFB547', letter: 'A', label: 'Regulatory assumption' },
    USER: { color: '#F0A6FF', letter: 'U', label: 'User supplied data' },
  },
  stressRamp: {
    safe: '#002051',
    semi: '#414d6b',
    critical: '#8c7e75',
    over: '#e6b729',
  },
  fonts: {
    sans: "'Inter Variable', sans-serif",
    mono: "'JetBrains Mono Variable', monospace",
  },
  spacing: {
    '05': '4px',
    '1': '8px',
    '2': '16px',
    '3': '24px',
    '4': '32px',
    '5': '40px',
    '6': '48px',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
  },
  motion: {
    fast: '120ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    base: '240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    slow: '480ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
} as const;

export type ProvKind = keyof typeof TOKENS.prov;
