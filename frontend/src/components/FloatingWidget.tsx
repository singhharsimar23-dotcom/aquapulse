import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useStore, WidgetLayout } from '../store/useStore';
import { Exempt } from './Exempt';

interface FloatingWidgetProps {
  id: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  error?: string | null;
}

export const FloatingWidget: React.FC<FloatingWidgetProps> = ({
  id,
  children,
  badge,
  loading = false,
  empty = false,
  emptyMessage = 'No data available',
  error = null,
}) => {
  const widget = useStore((state) => state.widgets[id]);
  const updateWidgetLayout = useStore((state) => state.updateWidgetLayout);
  const toggleWidgetVisible = useStore((state) => state.toggleWidgetVisible);
  const lite = useStore((state) => state.lite);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; startW: number; startH: number }>({
    mouseX: 0,
    mouseY: 0,
    startW: 0,
    startH: 0,
  });

  const handleMouseDownHeader = useCallback(
    (e: React.MouseEvent) => {
      if (widget?.pinned || lite) return;
      if ((e.target as HTMLElement).closest('button')) return;

      setIsDragging(true);
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startX: widget?.x ?? 0,
        startY: widget?.y ?? 0,
      };
      e.preventDefault();
    },
    [widget, lite]
  );

  const handleMouseDownResize = useCallback(
    (e: React.MouseEvent) => {
      if (widget?.pinned || widget?.collapsed || lite) return;

      setIsResizing(true);
      resizeStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startW: widget?.width ?? 400,
        startH: widget?.height ?? 300,
      };
      e.stopPropagation();
      e.preventDefault();
    },
    [widget, lite]
  );

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && widget) {
        const dx = e.clientX - dragStartRef.current.mouseX;
        const dy = e.clientY - dragStartRef.current.mouseY;
        const newX = Math.max(10, dragStartRef.current.startX + dx);
        const newY = Math.max(10, dragStartRef.current.startY + dy);
        updateWidgetLayout(id, { x: newX, y: newY });
      } else if (isResizing && widget) {
        const dw = e.clientX - resizeStartRef.current.mouseX;
        const dh = e.clientY - resizeStartRef.current.mouseY;
        const newW = Math.max(280, resizeStartRef.current.startW + dw);
        const newH = Math.max(160, resizeStartRef.current.startH + dh);
        updateWidgetLayout(id, { width: newW, height: newH });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, id, widget, updateWidgetLayout]);

  if (!widget || !widget.visible) return null;

  const style: React.CSSProperties = {
    position: widget.pinned ? 'relative' : 'absolute',
    left: widget.pinned ? undefined : `${widget.x}px`,
    top: widget.pinned ? undefined : `${widget.y}px`,
    width: widget.collapsed ? 'auto' : `${widget.width}px`,
    height: widget.collapsed ? 'auto' : `${widget.height}px`,
    zIndex: isDragging || isResizing ? 999 : 50,
  };

  return (
    <div
      className={`floating-widget ${widget.pinned ? 'widget-pinned' : ''} ${
        widget.collapsed ? 'widget-collapsed' : ''
      } ${isDragging ? 'dragging' : ''}`}
      style={style}
      role="region"
      aria-label={widget.title}
    >
      <div
        className="widget-header"
        onMouseDown={handleMouseDownHeader}
        style={{ cursor: widget.pinned ? 'default' : 'grab' }}
      >
        <div className="widget-title-area">
          <span className="widget-drag-indicator">⋮⋮</span>
          <span className="widget-title font-sans">
            <Exempt reason="id">{widget.title}</Exempt>
          </span>
          {widget.formulaRef && (
            <span className="widget-formula-ref font-mono" title={`Formula Reference ${widget.formulaRef}`}>
              <Exempt reason="id">{widget.formulaRef}</Exempt>
            </span>
          )}
          {badge}
        </div>

        <div className="widget-actions">
          <button
            className={`widget-btn ${widget.pinned ? 'active' : ''}`}
            onClick={() => updateWidgetLayout(id, { pinned: !widget.pinned })}
            title={widget.pinned ? 'Unpin Widget' : 'Pin Widget to Grid'}
            aria-label="Toggle pin"
          >
            📌
          </button>
          <button
            className="widget-btn"
            onClick={() => updateWidgetLayout(id, { collapsed: !widget.collapsed })}
            title={widget.collapsed ? 'Expand Widget' : 'Collapse Widget'}
            aria-label="Toggle collapse"
          >
            {widget.collapsed ? '+' : '−'}
          </button>
          <button
            className="widget-btn widget-btn-close"
            onClick={() => toggleWidgetVisible(id)}
            title="Hide Widget"
            aria-label="Close widget"
          >
            ✕
          </button>
        </div>
      </div>

      {!widget.collapsed && (
        <div className="widget-body">
          {loading ? (
            <div className="widget-loading">
              <div className="spinner" />
              <span>Loading telemetry...</span>
            </div>
          ) : error ? (
            <div className="widget-error" role="alert">
              <span>⚠️ Error: {error}</span>
            </div>
          ) : empty ? (
            <div className="widget-empty">
              <span>{emptyMessage}</span>
            </div>
          ) : (
            children
          )}

          {!widget.pinned && !lite && (
            <div
              className="widget-resize-handle"
              onMouseDown={handleMouseDownResize}
              title="Drag to resize"
            />
          )}
        </div>
      )}
    </div>
  );
};
