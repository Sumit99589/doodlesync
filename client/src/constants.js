// ─── Tool Definitions ──────────────────────────────────────────────

export const TOOLS = {
  SELECT: 'select',
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  ARROW: 'arrow',
  PEN: 'pen',
  TEXT: 'text',
  ERASER: 'eraser',
};

export const TOOL_LIST = [
  { id: TOOLS.SELECT, label: 'Select', key: 'V', icon: '↖' },
  { id: TOOLS.RECTANGLE, label: 'Rectangle', key: 'R', icon: '▭' },
  { id: TOOLS.ELLIPSE, label: 'Ellipse', key: 'E', icon: '⬭' },
  { id: TOOLS.ARROW, label: 'Arrow', key: 'A', icon: '→' },
  { id: TOOLS.PEN, label: 'Pen', key: 'P', icon: '✎' },
  { id: TOOLS.TEXT, label: 'Text', key: 'T', icon: 'T' },
  { id: TOOLS.ERASER, label: 'Eraser', key: 'X', icon: '⌫' },
];

export const KEY_TO_TOOL = {
  v: TOOLS.SELECT,
  r: TOOLS.RECTANGLE,
  e: TOOLS.ELLIPSE,
  a: TOOLS.ARROW,
  p: TOOLS.PEN,
  t: TOOLS.TEXT,
  x: TOOLS.ERASER,
};

// ─── Canvas Config ─────────────────────────────────────────────────

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 10;
export const ZOOM_STEP = 0.1;
export const DEFAULT_ZOOM = 1;

export const GRID_SIZE = 20;

// ─── Default Styles ────────────────────────────────────────────────

export const DEFAULT_STROKE_COLOR = '#e2e8f0';
export const DEFAULT_FILL_COLOR = 'transparent';
export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_OPACITY = 1;
export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 10;

// ─── Hit Testing ───────────────────────────────────────────────────

export const HIT_TEST_THRESHOLD = 5; // px tolerance for line/arrow hit testing
export const HANDLE_SIZE = 8;        // px for resize handles

// ─── Cursor Color Palette ──────────────────────────────────────────

export const CURSOR_COLORS = [
  '#f87171', // red
  '#fb923c', // orange
  '#fbbf24', // amber
  '#a3e635', // lime
  '#34d399', // emerald
  '#22d3ee', // cyan
  '#60a5fa', // blue
  '#a78bfa', // violet
  '#f472b6', // pink
  '#e879f9', // fuchsia
  '#818cf8', // indigo
  '#2dd4bf', // teal
];

/**
 * Deterministically pick a cursor color from a client ID.
 */
export function getCursorColor(clientId) {
  const index = Math.abs(clientId) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
}

// ─── Random Name Generator ─────────────────────────────────────────

const ADJECTIVES = [
  'Amber', 'Azure', 'Coral', 'Crimson', 'Cyan', 'Emerald', 'Golden',
  'Indigo', 'Jade', 'Lavender', 'Magenta', 'Mint', 'Onyx', 'Pearl',
  'Rose', 'Ruby', 'Sage', 'Scarlet', 'Silver', 'Teal', 'Violet',
];

const ANIMALS = [
  'Bear', 'Cat', 'Deer', 'Eagle', 'Falcon', 'Fox', 'Hawk', 'Heron',
  'Jaguar', 'Lynx', 'Otter', 'Owl', 'Panda', 'Raven', 'Swan',
  'Tiger', 'Whale', 'Wolf', 'Wren', 'Zebra',
];

export function generateRandomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}
