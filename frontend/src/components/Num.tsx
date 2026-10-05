import React, { useState } from 'react';
import { Prov, PROV_META } from '../lib/prov';

export interface NumProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | null | undefined;
  prov: Prov;
  unit?: string;
  precision?: number;
  className?: string;
  showCardOnHover?: boolean;
}

/**
 * Num Component per AQUAPULSE_V9_2_LEAN.md §8.3 & §8.6.
 * Renders formatted mono value, dim unit, 6px provenance dot with letter/color,
 * data-prov attribute, and accessible hover/focus card with source, asOf, hash and Prove it link.
 */
export const Num: React.FC<NumProps> = ({
  value,
  prov,
  unit,
  precision = 1,
  className = '',
  showCardOnHover = true,
  ...rest
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const meta = PROV_META[prov.kind] || PROV_META.SYNTH;

  const formattedValue =
    value === null || value === undefined
      ? '—'
      : Number.isInteger(value) && precision === 0
      ? value.toString()
      : value.toFixed(precision);

  return (
    <span
      className={`num-container ${className}`.trim()}
      data-prov={prov.kind}
      onMouseEnter={() => showCardOnHover && setIsOpen(true)}
      onMouseLeave={() => showCardOnHover && setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
      tabIndex={0}
      role="group"
      aria-label={`Measurement: ${formattedValue} ${unit || ''}, Provenance: ${prov.kind}`}
      {...rest}
    >
      <span className="num-value font-mono tabular-nums">{formattedValue}</span>
      {unit && <span className="num-unit text-2"> {unit}</span>}
      <span
        className={`prov-dot prov-dot-${prov.kind.toLowerCase()}`}
        style={{
          borderColor: meta.color,
          backgroundColor: prov.kind === 'ASSUMPTION' ? 'transparent' : meta.color,
        }}
        aria-hidden="true"
      >
        <span className="prov-dot-letter">{meta.letter}</span>
      </span>

      {isOpen && (
        <span className="prov-card" role="tooltip">
          <span className="prov-card-header">
            <span
              className="prov-badge"
              style={{
                borderColor: meta.color,
                color: meta.color,
              }}
            >
              {meta.letter} {prov.kind}
            </span>
            <span className="prov-asof font-mono">{prov.asOf}</span>
          </span>
          <span className="prov-source">{prov.source}</span>
          {prov.hash && (
            <span className="prov-hash font-mono text-3" title={prov.hash}>
              sha256: {prov.hash.slice(0, 12)}…
            </span>
          )}
          <span className="prov-prove-it-btn">
            Prove it →
          </span>
        </span>
      )}
    </span>
  );
};
