import React from 'react';
import { ProvReason, isProvReason } from '../lib/prov';

export interface ExemptProps extends React.HTMLAttributes<HTMLElement> {
  reason: ProvReason;
  as?: React.ElementType;
  children: React.ReactNode;
}

/**
 * Exempt wrapper for DOM elements containing non-measurement numbers.
 * Valid reasons: 'date', 'version', 'axis-tick', 'scene-id', 'hash', 'map-control', 'id'.
 * Per AQUAPULSE_V9_2_LEAN.md §8.6.
 */
export const Exempt: React.FC<ExemptProps> = ({
  reason,
  as: Component = 'span',
  children,
  className = '',
  ...rest
}) => {
  if (!isProvReason(reason)) {
    throw new Error(`Invalid data-prov-exempt reason: "${reason}". Must be one of: date, version, axis-tick, scene-id, hash, map-control, id.`);
  }

  return (
    <Component data-prov-exempt={reason} className={`prov-exempt ${className}`.trim()} {...rest}>
      {children}
    </Component>
  );
};
