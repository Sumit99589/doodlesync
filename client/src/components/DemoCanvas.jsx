import { useRef, useEffect, useCallback } from 'react';

/* ─── Animation Config ───────────────────────────────────────────── */

const PHASE_TIMINGS = [
  { name: 'rect',    start: 0,    end: 3    },
  { name: 'ellipse', start: 3,    end: 5.5  },
  { name: 'squiggle',start: 5.5,  end: 9    },
  { name: 'text',    start: 9,    end: 11   },
  { name: 'fadeout', start: 11,   end: 13   },
];

const TOTAL_DURATION = 13; // seconds

/* Colors */
const CORAL  = '#FF6B6B';
const VIOLET = '#9B5DE5';

/* Cursor waypoints (normalized 0–1 coords) */
const CURSOR_A_WAYPOINTS = [
  { x: 0.15, y: 0.25 }, { x: 0.25, y: 0.20 },
  { x: 0.50, y: 0.18 }, { x: 0.55, y: 0.35 },
  { x: 0.30, y: 0.50 }, { x: 0.20, y: 0.65 },
  { x: 0.40, y: 0.70 }, { x: 0.60, y: 0.55 },
  { x: 0.70, y: 0.30 }, { x: 0.50, y: 0.25 },
  { x: 0.15, y: 0.25 },
];

const CURSOR_B_WAYPOINTS = [
  { x: 0.75, y: 0.70 }, { x: 0.65, y: 0.55 },
  { x: 0.45, y: 0.60 }, { x: 0.35, y: 0.75 },
  { x: 0.55, y: 0.80 }, { x: 0.70, y: 0.65 },
  { x: 0.80, y: 0.45 }, { x: 0.60, y: 0.35 },
  { x: 0.50, y: 0.50 }, { x: 0.65, y: 0.60 },
  { x: 0.75, y: 0.70 },
];

/* Squiggle points (normalized) */
const SQUIGGLE_POINTS = [
  { x: 0.15, y: 0.60 }, { x: 0.20, y: 0.55 }, { x: 0.25, y: 0.62 },
  { x: 0.30, y: 0.54 }, { x: 0.35, y: 0.63 }, { x: 0.40, y: 0.52 },
  { x: 0.45, y: 0.60 }, { x: 0.50, y: 0.50 }, { x: 0.55, y: 0.58 },
  { x: 0.60, y: 0.48 }, { x: 0.65, y: 0.56 }, { x: 0.70, y: 0.46 },
  { x: 0.75, y: 0.55 }, { x: 0.80, y: 0.50 },
];

/* ─── Easing ─────────────────────────────────────────────────────── */

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getCursorPos(waypoints, time, totalTime, w, h) {
  const segmentCount = waypoints.length - 1;
  const totalT = (time % totalTime) / totalTime;
  const rawSeg = totalT * segmentCount;
  const segIdx = Math.min(Math.floor(rawSeg), segmentCount - 1);
  const segT = easeInOut(rawSeg - segIdx);

  const from = waypoints[segIdx];
  const to = waypoints[segIdx + 1] || waypoints[segIdx];

  return {
    x: lerp(from.x, to.x, segT) * w,
    y: lerp(from.y, to.y, segT) * h,
  };
}

/* ─── Drawing Helpers ────────────────────────────────────────────── */

function drawDashedRect(ctx, x, y, w, h, progress, color) {
  const perimeter = 2 * (w + h);
  const drawn = perimeter * progress;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([drawn, perimeter]);
  ctx.lineDashOffset = 0;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawDashedEllipse(ctx, cx, cy, rx, ry, progress, color) {
  const circumference = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const drawn = circumference * progress;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.setLineDash([drawn, circumference]);
  ctx.lineDashOffset = 0;

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSquiggle(ctx, points, pointCount, color, w, h) {
  if (pointCount < 2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x * w, points[0].y * h);
  for (let i = 1; i < pointCount; i++) {
    ctx.lineTo(points[i].x * w, points[i].y * h);
  }
  ctx.stroke();
}

function drawCursor(ctx, x, y, color, name) {
  // Arrow cursor shape
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = color;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 14);
  ctx.lineTo(4.5, 10.5);
  ctx.lineTo(8, 17);
  ctx.lineTo(11, 15.5);
  ctx.lineTo(7.5, 9);
  ctx.lineTo(12, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Name tag
  ctx.font = '600 10px Nunito, Inter, sans-serif';
  const textW = ctx.measureText(name).width;
  const tagX = 14;
  const tagY = 4;
  const tagPad = 4;

  ctx.fillStyle = color;
  const radius = 4;
  const tX = tagX - tagPad;
  const tY = tagY - 2;
  const tW = textW + tagPad * 2;
  const tH = 16;
  ctx.beginPath();
  ctx.roundRect(tX, tY, tW, tH, radius);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.fillText(name, tagX, tagY + 10);

  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────────────── */

export default function DemoCanvas({ onPhaseChange }) {
  const canvasRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastPhaseRef = useRef(-1);
  const rafRef = useRef(null);

  const render = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;

    // Resize canvas buffer if needed
    if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
      canvas.width = displayW * dpr;
      canvas.height = displayH * dpr;
      ctx.scale(dpr, dpr);
    }

    if (startTimeRef.current === null) startTimeRef.current = timestamp;
    const elapsed = ((timestamp - startTimeRef.current) / 1000) % TOTAL_DURATION;

    // Determine current phase
    let currentPhase = 0;
    for (let i = 0; i < PHASE_TIMINGS.length; i++) {
      if (elapsed >= PHASE_TIMINGS[i].start && elapsed < PHASE_TIMINGS[i].end) {
        currentPhase = i;
        break;
      }
    }

    // Notify phase change
    if (currentPhase !== lastPhaseRef.current) {
      lastPhaseRef.current = currentPhase;
      onPhaseChange?.(currentPhase);
    }

    const w = displayW;
    const h = displayH;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Light grid background
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let gx = 0; gx <= w; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    for (let gy = 0; gy <= h; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Global alpha for fade-out
    let globalAlpha = 1;
    if (currentPhase === 4) {
      const fadeProgress = (elapsed - PHASE_TIMINGS[4].start) / (PHASE_TIMINGS[4].end - PHASE_TIMINGS[4].start);
      globalAlpha = 1 - fadeProgress;
    }
    ctx.globalAlpha = globalAlpha;

    // Phase 1: Rectangle
    if (elapsed >= PHASE_TIMINGS[0].start) {
      const rectProgress = Math.min(1, (elapsed - PHASE_TIMINGS[0].start) / (PHASE_TIMINGS[0].end - PHASE_TIMINGS[0].start));
      drawDashedRect(ctx, w * 0.12, h * 0.12, w * 0.35, h * 0.35, rectProgress, CORAL);
    }

    // Phase 2: Ellipse
    if (elapsed >= PHASE_TIMINGS[1].start) {
      const ellipseProgress = Math.min(1, (elapsed - PHASE_TIMINGS[1].start) / (PHASE_TIMINGS[1].end - PHASE_TIMINGS[1].start));
      drawDashedEllipse(ctx, w * 0.68, h * 0.32, w * 0.16, h * 0.20, ellipseProgress, '#4ECDC4');
    }

    // Phase 3: Squiggle
    if (elapsed >= PHASE_TIMINGS[2].start) {
      const squiggleProgress = Math.min(1, (elapsed - PHASE_TIMINGS[2].start) / (PHASE_TIMINGS[2].end - PHASE_TIMINGS[2].start));
      const pointCount = Math.max(2, Math.floor(SQUIGGLE_POINTS.length * squiggleProgress));
      drawSquiggle(ctx, SQUIGGLE_POINTS, pointCount, VIOLET, w, h);
    }

    // Phase 4: Text
    if (elapsed >= PHASE_TIMINGS[3].start) {
      const textProgress = Math.min(1, (elapsed - PHASE_TIMINGS[3].start) / (PHASE_TIMINGS[3].end - PHASE_TIMINGS[3].start));
      ctx.save();
      ctx.globalAlpha = globalAlpha * textProgress;
      ctx.font = '700 22px Nunito, Inter, sans-serif';
      ctx.fillStyle = '#FFBE0B';
      ctx.fillText('Hello!', w * 0.38, h * 0.85);
      ctx.restore();
    }

    // Cursors (always visible, travel on their own loop)
    ctx.globalAlpha = globalAlpha;
    const cursorTime = (timestamp - startTimeRef.current) / 1000;
    const posA = getCursorPos(CURSOR_A_WAYPOINTS, cursorTime, 8, w, h);
    const posB = getCursorPos(CURSOR_B_WAYPOINTS, cursorTime, 10, w, h);

    drawCursor(ctx, posA.x, posA.y, CORAL, 'Alex');
    drawCursor(ctx, posB.x, posB.y, VIOLET, 'Sam');

    ctx.globalAlpha = 1;

    rafRef.current = requestAnimationFrame(render);
  }, [onPhaseChange]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className="demo-canvas"
      style={{
        width: '100%',
        maxWidth: 440,
        height: 320,
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 8px 40px rgba(155,93,229,0.25)',
        display: 'block',
      }}
    />
  );
}
