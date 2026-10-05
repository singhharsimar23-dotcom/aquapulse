import React from 'react';

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  radius?: 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'recessed' | 'hero';
  children: React.ReactNode;
}

/**
 * Design System Panel component (§8.3).
 * Translucent solid, 1px hairline border, radius 10/14, backdrop blur in Full mode.
 */
export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  actions,
  footer,
  radius = 'md',
  variant = 'default',
  className = '',
  children,
  ...rest
}) => {
  const radiusClass = radius === 'lg' ? 'panel-radius-lg' : 'panel-radius-md';
  const variantClass = `panel-${variant}`;

  return (
    <div
      className={`ds-panel ${radiusClass} ${variantClass} ${className}`.trim()}
      {...rest}
    >
      {(title || actions || subtitle) && (
        <div className="panel-header">
          <div className="panel-title-group">
            {title && <h3 className="panel-title">{title}</h3>}
            {subtitle && <span className="panel-subtitle text-2">{subtitle}</span>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </div>
      )}
      <div className="panel-body">{children}</div>
      {footer && <div className="panel-footer">{footer}</div>}
    </div>
  );
};
