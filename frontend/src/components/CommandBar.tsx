import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ComputedDashboardModel } from '../lib/snapshotLoader';
import { Exempt } from './Exempt';

interface CommandBarProps {
  model: ComputedDashboardModel;
}

export const CommandBar: React.FC<CommandBarProps> = ({ model }) => {
  const {
    isCommandBarOpen,
    setCommandBarOpen,
    setSelectedFarmerId,
    toggleWidgetVisible,
    widgets,
    toggleLayer,
    openProveIt,
  } = useStore();

  const [query, setQuery] = useState('');

  // Handle Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandBarOpen(!isCommandBarOpen);
      } else if (e.key === 'Escape' && isCommandBarOpen) {
        setCommandBarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandBarOpen, setCommandBarOpen]);

  if (!isCommandBarOpen) return null;

  const filteredFarmers = model.farmers.filter(
    (f) =>
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="command-bar-backdrop" onClick={() => setCommandBarOpen(false)}>
      <div
        className="command-bar-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command Bar"
      >
        <div className="command-bar-input-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="command-bar-input font-sans"
            placeholder="Type a command or jump to farmer (Ctrl+K)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <span className="esc-hint font-mono text-2">ESC</span>
        </div>

        <div className="command-bar-results">
          {/* Quick jump to farmers */}
          <div className="command-group">
            <span className="group-heading text-2">Jump to Farmer</span>
            {filteredFarmers.map((f) => (
              <div
                key={f.id}
                className="command-item"
                onClick={() => {
                  setSelectedFarmerId(f.id);
                  setCommandBarOpen(false);
                }}
              >
                <span className="item-icon">👨‍🌾</span>
                <span className="item-title">{f.name}</span>
                <span className="item-badge font-mono text-2">
                  <Exempt reason="id">{f.id}</Exempt>
                </span>
              </div>
            ))}
          </div>

          {/* Widgets Toggle */}
          <div className="command-group">
            <span className="group-heading text-2">Toggle Widgets</span>
            {Object.values(widgets).map((w) => (
              <div
                key={w.id}
                className="command-item"
                onClick={() => {
                  toggleWidgetVisible(w.id);
                  setCommandBarOpen(false);
                }}
              >
                <span className="item-icon">📊</span>
                <span className="item-title">
                  <Exempt reason="id">{w.title}</Exempt>
                </span>
                <span className={`item-badge font-mono text-2 ${w.visible ? 'active' : ''}`}>
                  <Exempt reason="id">{w.visible ? 'VISIBLE' : 'HIDDEN'}</Exempt>
                </span>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="command-group">
            <span className="group-heading text-2">Quick Actions</span>
            <div
              className="command-item"
              onClick={() => {
                useStore.getState().setCsvModalOpen(true);
                setCommandBarOpen(false);
              }}
            >
              <span className="item-icon">📁</span>
              <span className="item-title">Bring-Your-Own CSV (§8.11)</span>
            </div>
            <div
              className="command-item"
              onClick={() => {
                useStore.getState().setCommitteeModalOpen(true, 'C');
                setCommandBarOpen(false);
              }}
            >
              <span className="item-icon">⚖️</span>
              <span className="item-title">Village Water Committee Hearing (§6.5)</span>
            </div>
            <div
              className="command-item"
              onClick={() => {
                openProveIt();
                setCommandBarOpen(false);
              }}
            >
              <span className="item-icon">🛡️</span>
              <span className="item-title">Open Prove It (Provenance Inspector)</span>
            </div>
            <div
              className="command-item"
              onClick={() => {
                toggleLayer('cones');
                setCommandBarOpen(false);
              }}
            >
              <span className="item-icon">🌊</span>
              <span className="item-title">Toggle Theis Cones of Depression</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
