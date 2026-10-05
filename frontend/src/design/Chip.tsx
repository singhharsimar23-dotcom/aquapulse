import React from 'react';
import { TOKENS, ProvKind } from './tokens';

export type ChipVariant = 'default' | 'ok' | 'review' | 'critical' | 'focus' | ProvKind;

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  label?: string;
  symbol?: string;
  withDot?: boolean;
  size?: 'sm' | 'md';
  children?: React.ReactNode;
}

const VARIANT_SYMBOLS: Record<string, string> = {
  ok: '✓',
  review: '!',
  critical: '✕',
  focus: '•',
  LIVE: 'L',
  REPLAY: 'R',
  SYNTH: 'S',
  ASSUMPTION: 'A',
  USER: 'U',
};

/**
 * Design System Chip component (§8.3).
 * Status or provenance pill. Never relies on colour alone; always includes
 * a text or symbol identifier (e.g. L/R/S/A/U or ✓/!/✕) with tabular numbers support.
 */
export const Chip: React.FC<ChipProps> = ({
  variant = 'default',
  label,
  symbol,
  withDot = true,
  size = 'md',
  className = '',
  children,
  ...rest
}) => {
  const isProv = variant in TOKENS.prov;
  const provMeta = isProv ? TOKENS.prov[variant as ProvKind] : null;

  const displaySymbol = symbol || VARIANT_SYMBOLS[variant] || '';
  const displayLabel = label || (isProv ? provMeta?.label : undefined);

  return (
    <span
      className={`ds-chip ds-chip-${variant.toLowerCase()} ds-chip-${size} ${className}`.trim()}
      {...(isProv ? { 'data-prov': variant } : {})}
      {...rest}
    >
      {withDot && isProv && provMeta && (
        <span
          className="chip-prov-dot"
          style={{
            borderColor: provMeta.color,
            backgroundColor: variant === 'ASSUMPTION' ? 'transparent' : provMeta.color,
          }}
          aria-hidden="true"
        >
          <span className="chip-prov-letter">{provMeta.letter}</span>
        </span>
      )}
      {!isProv && displaySymbol && (
        <span className="chip-symbol font-mono" aria-hidden="true">
          [{displaySymbol}]
        </span>
      )}
      <span className="chip-content tabular-nums">
        {displayLabel || children}
      </span>
    </span>
  );
};
