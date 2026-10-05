import React, { useEffect, useRef } from 'react';
import { HeroFrame } from './frame';

interface HeroCanvasProps {
  frame: HeroFrame;
  lite?: boolean;
  reducedMotion?: boolean;
}

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  radius: number;
}

export const HeroCanvas: React.FC<HeroCanvasProps> = ({
  frame,
  lite = false,
  reducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // Initialize or reseed particles (max 200 <= 400 budget)
  useEffect(() => {
    if (lite || reducedMotion) {
      particlesRef.current = [];
      return;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        progress: Math.random(),
        speed: 0.005 + Math.random() * 0.01,
        radius: 1.5 + Math.random() * 1.5,
      });
    }
    particlesRef.current = particles;
  }, [lite, reducedMotion]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const render = () => {
      if (!isVisible) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = lite || reducedMotion ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 32;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Aquifer Well Center Cone
      const centerX = width * 0.5;
      const centerY = height * 0.58;

      // Draw Cone of Depression
      const coneRadius = lite ? 80 : 110;
      const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, coneRadius);
      grad.addColorStop(0, 'rgba(76, 201, 240, 0.25)');
      grad.addColorStop(0.7, 'rgba(76, 201, 240, 0.08)');
      grad.addColorStop(1, 'rgba(76, 201, 240, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, coneRadius, coneRadius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(76, 201, 240, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Well Head Pin
      ctx.fillStyle = '#4CC9F0';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Plot layout for 4 farmers in pseudo-isometric perspective
      const plotPositions = [
        { id: 'A', x: width * 0.22, y: height * 0.45 },
        { id: 'B', x: width * 0.38, y: height * 0.28 },
        { id: 'C', x: width * 0.62, y: height * 0.28 },
        { id: 'D', x: width * 0.78, y: height * 0.45 },
      ];

      // Draw water flow lines in Beat 4 & 5
      if (frame.beat >= 4) {
        plotPositions.forEach((plot, idx) => {
          const col = frame.columns[idx];
          const flowWidth = Math.max(1.5, Math.min(6, (col?.allocValue || 10) / 7));

          ctx.strokeStyle = 'rgba(76, 201, 240, 0.35)';
          ctx.lineWidth = flowWidth;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(plot.x, plot.y);
          ctx.stroke();

          // Flow particles
          if (!lite && !reducedMotion) {
            const particlesForPlot = particlesRef.current.slice(idx * 25, (idx + 1) * 25);
            particlesForPlot.forEach((p) => {
              p.progress += p.speed;
              if (p.progress > 1) p.progress = 0;

              const px = centerX + (plot.x - centerX) * p.progress;
              const py = centerY + (plot.y - centerY) * p.progress;

              ctx.fillStyle = '#4CC9F0';
              ctx.beginPath();
              ctx.arc(px, py, p.radius, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        });
      }

      // Draw columns and farmer plots
      plotPositions.forEach((pos, idx) => {
        const col = frame.columns[idx];
        if (!col) return;

        const baseWidth = 32;
        const maxH = height * 0.42;
        const scaleH = maxH / 55; // up to 55 m3

        // Plot ground base ellipse
        ctx.fillStyle = col.hasReview ? 'rgba(255, 181, 71, 0.12)' : 'rgba(21, 27, 36, 0.8)';
        ctx.strokeStyle = col.hasReview ? '#FFB547' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, baseWidth * 0.75, baseWidth * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Floor ring under every column in Beat 4 & 5
        if (col.hasFloorRing) {
          ctx.strokeStyle = '#3DDC97';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y, baseWidth * 0.9, baseWidth * 0.42, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Ghost column (Reports R * Q)
        const ghostH = col.ghostHeight * scaleH;
        if (ghostH > 0) {
          ctx.save();
          ctx.strokeStyle = '#9B8CFF'; // SYNTH prov color
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 1.5;
          ctx.fillStyle = 'rgba(155, 140, 255, 0.08)';

          const gx = pos.x - baseWidth / 2;
          const gy = pos.y - ghostH;
          ctx.fillRect(gx, gy, baseWidth, ghostH);
          ctx.strokeRect(gx, gy, baseWidth, ghostH);
          ctx.restore();
        }

        // Connecting line between ghost and solid column (Beat 2 & 3)
        const solidH = col.solidHeight * scaleH;
        if (frame.beat === 2 && col.isTowering) {
          ctx.strokeStyle = 'rgba(255, 181, 71, 0.6)';
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(pos.x + baseWidth / 2, pos.y - ghostH);
          ctx.lineTo(pos.x + baseWidth / 2, pos.y - solidH);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Translucent satellite-band shell around C (Beat 2 & 3)
        if (col.id === 'C' && frame.satellite.shellAroundC) {
          ctx.save();
          ctx.strokeStyle = 'rgba(61, 220, 151, 0.6)';
          ctx.fillStyle = 'rgba(61, 220, 151, 0.1)';
          ctx.lineWidth = 2;

          const shellRadius = baseWidth * 1.4;
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y - solidH * 0.5, shellRadius, solidH * 0.6 + 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // Solid Column
        if (solidH > 0) {
          ctx.save();
          const sx = pos.x - baseWidth / 2;
          const sy = pos.y - solidH;

          // Escrow split visualization (Beat 4 & 5)
          if (col.hasEscrowHatch && col.escrowValue > 0) {
            const relH = (col.releasedValue / col.allocValue) * solidH;
            const escH = solidH - relH;

            // Released water base
            ctx.fillStyle = '#4CC9F0';
            ctx.fillRect(sx, pos.y - relH, baseWidth, relH);

            // Escrow hatched water top
            ctx.fillStyle = 'rgba(255, 181, 71, 0.85)';
            ctx.fillRect(sx, sy, baseWidth, escH);

            // Hatch lines
            ctx.strokeStyle = 'rgba(7, 9, 13, 0.6)';
            ctx.lineWidth = 1.5;
            for (let hy = sy; hy < sy + escH; hy += 6) {
              ctx.beginPath();
              ctx.moveTo(sx, hy);
              ctx.lineTo(sx + baseWidth, hy + 6);
              ctx.stroke();
            }
          } else {
            // Standard solid column
            if (col.hasReview) {
              ctx.fillStyle = 'rgba(255, 181, 71, 0.85)';
              ctx.strokeStyle = '#FFB547';
            } else {
              ctx.fillStyle = 'rgba(76, 201, 240, 0.75)';
              ctx.strokeStyle = '#4CC9F0';
            }
            ctx.fillRect(sx, sy, baseWidth, solidH);
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, baseWidth, solidH);
          }
          ctx.restore();
        }

        // Farmer identification label below
        ctx.fillStyle = '#E8EDF4';
        ctx.font = '600 12px "Inter Variable", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Farmer ${col.id}`, pos.x, pos.y + 22);

        // Subtext (U or alloc)
        ctx.fillStyle = '#9AA7B8';
        ctx.font = '11px "JetBrains Mono Variable", monospace';
        ctx.fillText(`${col.displayValue.toFixed(1)} m³`, pos.x, pos.y + 36);

        // REVIEW pulse badge
        if (col.hasReview && frame.beat >= 3) {
          ctx.fillStyle = '#FFB547';
          ctx.font = '700 10px "JetBrains Mono Variable", monospace';
          ctx.fillText('[! REVIEW]', pos.x, pos.y - (Math.max(solidH, ghostH) + 12));
        }
      });

      ctx.restore();

      if (!lite && !reducedMotion) {
        animFrameIdRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [frame, lite, reducedMotion]);

  return (
    <div className="hero-canvas-container" style={{ position: 'relative', width: '100%', height: '380px' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
};
