import { nanoid } from 'nanoid';
import { smoothPath } from './smoothPath';
import {
  HIT_TEST_THRESHOLD,
  HANDLE_SIZE,
  DEFAULT_STROKE_COLOR,
  DEFAULT_FILL_COLOR,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_OPACITY,
} from '../constants';

// ─── Element Creation ──────────────────────────────────────────────

export function createElement(type, x, y, options = {}) {
  const typeLabel = type === 'pen' ? 'Path' : type.charAt(0).toUpperCase() + type.slice(1);
  const base = {
    id: nanoid(),
    type,
    x,
    y,
    width: 0,
    height: 0,
    strokeColor: options.strokeColor || DEFAULT_STROKE_COLOR,
    fillColor: options.fillColor || DEFAULT_FILL_COLOR,
    strokeWidth: options.strokeWidth || DEFAULT_STROKE_WIDTH,
    opacity: options.opacity ?? DEFAULT_OPACITY,
    name: options.name || typeLabel,
    hidden: false,
    locked: false,
  };

  switch (type) {
    case 'rectangle':
    case 'ellipse':
      return { ...base };
    case 'arrow':
      return {
        ...base,
        points: [
          { x, y },
          { x: options.endX ?? x, y: options.endY ?? y },
        ],
      };
    case 'pen':
      return {
        ...base,
        points: [{ x, y }],
        smoothedPoints: [],
      };
    case 'text':
      return {
        ...base,
        text: options.text || '',
        fontSize: options.fontSize || 18,
        width: 150,
        height: 24,
      };
    default:
      return base;
  }
}

// ─── Element Update ────────────────────────────────────────────────

export function updateElement(element, updates) {
  return { ...element, ...updates };
}

// ─── Finalize Freehand (apply Chaikin smoothing) ───────────────────

export function finalizePenElement(element) {
  if (element.type !== 'pen' || !element.points) return element;
  const smoothed = smoothPath(element.points, 3);
  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of smoothed) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    ...element,
    smoothedPoints: smoothed,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// ─── Bounding Box ──────────────────────────────────────────────────

export function getBoundingBox(element) {
  if (element.type === 'arrow' && element.points) {
    const [p0, p1] = element.points;
    const minX = Math.min(p0.x, p1.x);
    const minY = Math.min(p0.y, p1.y);
    const maxX = Math.max(p0.x, p1.x);
    const maxY = Math.max(p0.y, p1.y);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  if (element.type === 'pen' && element.smoothedPoints?.length) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of element.smoothedPoints) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return { x: element.x, y: element.y, width: element.width, height: element.height };
}

export function getMultiBoundingBox(elements) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const bb = getBoundingBox(el);
    if (bb.x < minX) minX = bb.x;
    if (bb.y < minY) minY = bb.y;
    if (bb.x + bb.width > maxX) maxX = bb.x + bb.width;
    if (bb.y + bb.height > maxY) maxY = bb.y + bb.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ─── Hit Testing ───────────────────────────────────────────────────

/**
 * Returns true if (px, py) hits the element.
 * Threshold is adjusted by scale for consistent feel at all zoom levels.
 */
export function hitTest(element, px, py, scale = 1) {
  const threshold = HIT_TEST_THRESHOLD / scale;

  switch (element.type) {
    case 'rectangle':
    case 'text':
      return hitTestRect(element, px, py, threshold);

    case 'ellipse':
      return hitTestEllipse(element, px, py, threshold);

    case 'arrow':
      return hitTestArrow(element, px, py, threshold);

    case 'pen':
      return hitTestPen(element, px, py, threshold);

    default:
      return hitTestRect(element, px, py, threshold);
  }
}

function hitTestRect(el, px, py, threshold) {
  return (
    px >= el.x - threshold &&
    px <= el.x + el.width + threshold &&
    py >= el.y - threshold &&
    py <= el.y + el.height + threshold
  );
}

function hitTestEllipse(el, px, py, threshold) {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rx = el.width / 2 + threshold;
  const ry = el.height / 2 + threshold;
  if (rx === 0 || ry === 0) return false;
  const val = ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2);
  return val <= 1;
}

/**
 * Arrow hit test: point-to-segment distance.
 * d = |AB × AP| / |AB| where AB is the arrow vector and AP is the test point relative to start.
 */
function hitTestArrow(el, px, py, threshold) {
  if (!el.points || el.points.length < 2) return false;
  const [p0, p1] = el.points;
  return pointToSegmentDistance(px, py, p0.x, p0.y, p1.x, p1.y) <= threshold;
}

/**
 * Freehand pen hit test: iterate over consecutive smoothed point pairs
 * and check point-to-segment distance for each.
 */
function hitTestPen(el, px, py, threshold) {
  const pts = el.smoothedPoints?.length ? el.smoothedPoints : el.points;
  if (!pts || pts.length < 2) return false;
  for (let i = 0; i < pts.length - 1; i++) {
    if (pointToSegmentDistance(px, py, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= threshold) {
      return true;
    }
  }
  return false;
}

/**
 * Compute the shortest distance from point (px, py) to the line segment (x1,y1)-(x2,y2).
 */
function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // Segment is a point
    return Math.hypot(px - x1, py - y1);
  }

  // Project (px,py) onto the line and clamp to segment
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.hypot(px - projX, py - projY);
}

// ─── Resize Handle Detection ──────────────────────────────────────

/**
 * Returns the handle name ('nw', 'ne', 'sw', 'se') if the cursor is
 * on a resize handle, or null if not.
 */
export function getResizeHandle(element, px, py, scale = 1) {
  const bb = getBoundingBox(element);
  const hs = HANDLE_SIZE / scale;

  const corners = {
    nw: { x: bb.x, y: bb.y },
    ne: { x: bb.x + bb.width, y: bb.y },
    sw: { x: bb.x, y: bb.y + bb.height },
    se: { x: bb.x + bb.width, y: bb.y + bb.height },
  };

  for (const [name, pos] of Object.entries(corners)) {
    if (Math.abs(px - pos.x) <= hs && Math.abs(py - pos.y) <= hs) {
      return name;
    }
  }

  return null;
}
