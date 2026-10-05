import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Design System Button component (§8.3).
 * Accessible, keyboard-interactive, styled with 1px hairline or solid accent focus.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}) => {
  return (
    <button
      className={`ds-btn ds-btn-${variant} ds-btn-${size} ${className}`.trim()}
      {...rest}
    >
      {icon && <span className="ds-btn-icon" aria-hidden="true">{icon}</span>}
      {children && <span className="ds-btn-label">{children}</span>}
    </button>
  );
};
