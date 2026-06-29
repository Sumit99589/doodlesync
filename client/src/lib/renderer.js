import { GRID_SIZE, HANDLE_SIZE } from '../constants';

/**
 * Main rendering pipeline for the canvas.
 * Draws: grid → elements → selection handles → active preview.
 */
export function renderCanvas(ctx, state) {
  const { width, height, zoom, panX, panY, elements, selectedIds, activePreview } = state;

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // Apply camera transform
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  // 1. Background grid
  drawGrid(ctx, width, height, zoom, panX, panY);

  // 2. Elements
  for (const el of elements) {
    if (el.hidden) continue;
    drawElement(ctx, el);
  }

  // 3. Active preview (element being drawn right now)
  if (activePreview) {
    drawElement(ctx, activePreview);
  }

  // 4. Selection handles
  if (selectedIds.length > 0) {
    const selectedEls = elements.filter((el) => selectedIds.includes(el.id));
    for (const el of selectedEls) {
      drawSelectionBox(ctx, el, zoom);
    }
  }

  ctx.restore();
}

// ─── Grid ──────────────────────────────────────────────────────────

function drawGrid(ctx, canvasW, canvasH, zoom, panX, panY) {
  const gridSize = GRID_SIZE;

  // Compute visible area in world coordinates
  const startX = Math.floor(-panX / zoom / gridSize) * gridSize;
  const startY = Math.floor(-panY / zoom / gridSize) * gridSize;
  const endX = startX + canvasW / zoom + gridSize * 2;
  const endY = startY + canvasH / zoom + gridSize * 2;

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1 / zoom;

  for (let x = startX; x <= endX; x += gridSize) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += gridSize) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
}

// ─── Element Drawing ───────────────────────────────────────────────

export function drawElement(ctx, el) {
  ctx.save();
  ctx.globalAlpha = el.opacity ?? 1;
  ctx.strokeStyle = el.strokeColor || '#e2e8f0';
  ctx.fillStyle = el.fillColor || 'transparent';
  ctx.lineWidth = el.strokeWidth || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (el.type) {
    case 'rectangle':
      drawRect(ctx, el);
      break;
    case 'ellipse':
      drawEllipse(ctx, el);
      break;
    case 'arrow':
      drawArrow(ctx, el);
      break;
    case 'pen':
      drawPen(ctx, el);
      break;
    case 'text':
      drawText(ctx, el);
      break;
  }

  ctx.restore();
}

function drawRect(ctx, el) {
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillRect(el.x, el.y, el.width, el.height);
  }
  ctx.strokeRect(el.x, el.y, el.width, el.height);
}

function drawEllipse(ctx, el) {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rx = Math.abs(el.width / 2);
  const ry = Math.abs(el.height / 2);

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fill();
  }
  ctx.stroke();
}

function drawArrow(ctx, el) {
  if (!el.points || el.points.length < 2) return;
  const [start, end] = el.points;

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  // Arrowhead
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLen = 12 + el.strokeWidth * 2;

  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLen * Math.cos(angle - Math.PI / 6),
    end.y - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLen * Math.cos(angle + Math.PI / 6),
    end.y - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function drawPen(ctx, el) {
  const pts = el.smoothedPoints?.length ? el.smoothedPoints : el.points;
  if (!pts || pts.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
}

function drawText(ctx, el) {
  ctx.font = `${el.fontSize || 18}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = el.strokeColor || '#e2e8f0';
  ctx.textBaseline = 'top';

  const lines = (el.text || '').split('\n');
  const lineHeight = (el.fontSize || 18) * 1.3;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], el.x, el.y + i * lineHeight);
  }
}

// ─── Selection Handles ─────────────────────────────────────────────

function drawSelectionBox(ctx, el, zoom) {
  const padding = 4 / zoom;
  const hs = HANDLE_SIZE / zoom;
  const x = el.x - padding;
  const y = el.y - padding;
  const w = el.width + padding * 2;
  const h = el.height + padding * 2;

  // Dashed outline
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  // Corner handles
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1.5 / zoom;

  const corners = [
    [x - hs / 2, y - hs / 2],
    [x + w - hs / 2, y - hs / 2],
    [x - hs / 2, y + h - hs / 2],
    [x + w - hs / 2, y + h - hs / 2],
  ];

  for (const [cx, cy] of corners) {
    ctx.fillRect(cx, cy, hs, hs);
    ctx.strokeRect(cx, cy, hs, hs);
  }
}
