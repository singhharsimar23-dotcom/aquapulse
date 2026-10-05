import React from 'react';
import { useStore } from '../store/useStore';
import { Exempt } from './Exempt';

/**
 * Weekly Scrubber per AQUAPULSE_V9_2_LEAN.md §8.5 & S6:
 * Interactive timeline scrubber with LIVE vs REPLAY marker.
 */
export const WeeklyScrubber: React.FC = () => {
  const { week, setWeek } = useStore();
  const isLive = week >= 10;

  return (
    <div className="weekly-scrubber-container" role="region" aria-label="Weekly Timeline Scrubber">
      <div className="scrubber-controls">
        <button
          className="scrub-btn"
          onClick={() => setWeek(week - 1)}
          disabled={week <= 1}
          aria-label="Previous week"
        >
          ‹
        </button>

        <div className="scrubber-label-group">
          <span className="scrubber-title">Week</span>
          <Exempt reason="axis-tick" className="week-number font-mono bold">
            {week}
          </Exempt>
          <span className={`status-pill ${isLive ? 'pill-live' : 'pill-replay'}`}>
            {isLive ? '● LIVE' : '↺ REPLAY'}
          </span>
        </div>

        <button
          className="scrub-btn"
          onClick={() => setWeek(week + 1)}
          disabled={week >= 52}
          aria-label="Next week"
        >
          ›
        </button>
      </div>

      <div className="slider-wrapper">
        <input
          type="range"
          min="1"
          max="52"
          value={week}
          onChange={(e) => setWeek(parseInt(e.target.value, 10))}
          className="scrubber-slider"
          aria-label="Timeline week slider"
        />
        <div className="scrubber-ticks">
          <Exempt reason="axis-tick" className="tick text-3">W1</Exempt>
          <Exempt reason="axis-tick" className="tick text-3">W10 (Now)</Exempt>
          <Exempt reason="axis-tick" className="tick text-3">W26</Exempt>
          <Exempt reason="axis-tick" className="tick text-3">W52</Exempt>
        </div>
      </div>
    </div>
  );
};
