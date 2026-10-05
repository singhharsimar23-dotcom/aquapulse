/**
 * Frame-time Governor per AQUAPULSE_V9_2_LEAN.md §8.10.
 * Tracks frame intervals over a rolling 2-second window.
 * If rolling median > 24 ms (< ~41 fps), automatically triggers Lite mode.
 * In Lite mode: DPR = 1, no blur, particles disabled, columns snap, single-colour cones.
 */

export interface FrameGovernorProfile {
  fps: number;
  medianMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
  droppedFrames: number;
  totalFrames: number;
  isLite: boolean;
}

export class FrameGovernor {
  private frameDeltas: number[] = [];
  private lastTime: number = 0;
  private isLite: boolean = false;
  private onTriggerLite?: () => void;
  private isProfiling: boolean = false;
  private droppedFrames: number = 0;
  private totalFrames: number = 0;

  constructor(options?: {
    isLite?: boolean;
    onTriggerLite?: () => void;
    isProfiling?: boolean;
  }) {
    this.isLite = options?.isLite ?? false;
    this.onTriggerLite = options?.onTriggerLite;
    this.isProfiling = options?.isProfiling ?? false;
  }

  public setLite(lite: boolean): void {
    this.isLite = lite;
  }

  public recordFrame(now: number): void {
    if (this.lastTime === 0) {
      this.lastTime = now;
      return;
    }

    const delta = now - this.lastTime;
    this.lastTime = now;

    // Reject invalid negative or giant resume deltas (e.g. tab paused)
    if (delta <= 0 || delta > 1000) return;

    this.totalFrames++;
    if (delta > 33.33) {
      this.droppedFrames++;
    }

    this.frameDeltas.push(delta);

    // Keep approximately 2 seconds of frames (at 60fps ~ 120 frames, at 30fps ~ 60 frames)
    const cutoff = now - 2000;
    // Simple window capping: retain max 120 entries
    if (this.frameDeltas.length > 120) {
      this.frameDeltas.shift();
    }

    // Check rolling median
    if (!this.isLite && this.frameDeltas.length >= 30) {
      const median = this.getMedianDelta();
      if (median > 24.0) {
        // Rolling median > 24 ms → engage Lite mode
        this.isLite = true;
        if (this.onTriggerLite) {
          this.onTriggerLite();
        }
        if (this.isProfiling || typeof window !== 'undefined') {
          console.warn(`[FrameGovernor] Rolling median ${median.toFixed(1)} ms > 24 ms threshold; engaged Lite mode`);
        }
      }
    }
  }

  public getMedianDelta(): number {
    if (this.frameDeltas.length === 0) return 16.67;
    const sorted = [...this.frameDeltas].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  public getProfile(): FrameGovernorProfile {
    const deltas = this.frameDeltas.length > 0 ? this.frameDeltas : [16.67];
    const sorted = [...deltas].sort((a, b) => a - b);
    const median = this.getMedianDelta();
    const p95Idx = Math.floor(sorted.length * 0.95);
    const p95 = sorted[Math.min(p95Idx, sorted.length - 1)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const fps = median > 0 ? Math.round(1000 / median) : 60;

    return {
      fps,
      medianMs: Number(median.toFixed(2)),
      p95Ms: Number(p95.toFixed(2)),
      minMs: Number(min.toFixed(2)),
      maxMs: Number(max.toFixed(2)),
      droppedFrames: this.droppedFrames,
      totalFrames: this.totalFrames,
      isLite: this.isLite,
    };
  }

  public reset(): void {
    this.frameDeltas = [];
    this.lastTime = 0;
    this.droppedFrames = 0;
    this.totalFrames = 0;
  }
}
