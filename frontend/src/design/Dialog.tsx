import React, { useEffect, useRef } from 'react';
import { Button } from './Button';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Design System Dialog component (§8.3).
 * Modal overlay with radius-lg (14px), 1px hairline border, backdrop blur in Full mode,
 * Escape key listener and accessible focus.
 */
export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className = '',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ds-dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={`ds-dialog-container panel-radius-lg ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="ds-dialog-header">
          <div>
            <h2 id="dialog-title" className="ds-dialog-title">{title}</h2>
            {subtitle && <p className="ds-dialog-subtitle text-2">{subtitle}</p>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
            className="ds-dialog-close-btn"
          >
            ✕
          </Button>
        </div>

        <div className="ds-dialog-body">{children}</div>

        {footer && <div className="ds-dialog-footer">{footer}</div>}
      </div>
    </div>
  );
};
