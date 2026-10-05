import React from 'react';
import { Num } from '../components/Num';
import { Prov } from '../lib/prov';

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value?: number | null;
  prov?: Prov;
  unit?: string;
  precision?: number;
  subtext?: React.ReactNode;
  badge?: React.ReactNode;
  customValue?: React.ReactNode;
}

/**
 * Design System Stat card component (§8.3).
 * Renders label, monospace tabular value with 6px provenance dot, unit, and subtext.
 */
export const Stat: React.FC<StatProps> = ({
  label,
  value,
  prov,
  unit,
  precision = 1,
  subtext,
  badge,
  customValue,
  className = '',
  ...rest
}) => {
  return (
    <div className={`ds-stat-card ${className}`.trim()} {...rest}>
      <div className="stat-card-header">
        <span className="stat-label text-2">{label}</span>
        {badge && <div className="stat-badge">{badge}</div>}
      </div>

      <div className="stat-value-row">
        {customValue ? (
          customValue
        ) : prov ? (
          <Num
            value={value}
            prov={prov}
            unit={unit}
            precision={precision}
          />
        ) : (
          <span className="font-mono tabular-nums text-1 bold">
            {value ?? '—'}
            {unit && <span className="text-2"> {unit}</span>}
          </span>
        )}
      </div>

      {subtext && <div className="stat-subtext text-3">{subtext}</div>}
    </div>
  );
};
