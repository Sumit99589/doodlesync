import { create } from 'zustand';
import {
  TOOLS,
  DEFAULT_STROKE_COLOR,
  DEFAULT_FILL_COLOR,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_OPACITY,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
} from '../constants';

const useCanvasStore = create((set, get) => ({
  // ─── Active Tool ─────────────────────────────────────
  tool: TOOLS.SELECT,
  setTool: (tool) => set({ tool }),

  // ─── Style Defaults ─────────────────────────────────
  strokeColor: DEFAULT_STROKE_COLOR,
  fillColor: DEFAULT_FILL_COLOR,
  strokeWidth: DEFAULT_STROKE_WIDTH,
  opacity: DEFAULT_OPACITY,
  setStrokeColor: (color) => set({ strokeColor: color }),
  setFillColor: (color) => set({ fillColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setOpacity: (opacity) => set({ opacity }),

  // ─── Canvas Transform ───────────────────────────────
  zoom: DEFAULT_ZOOM,
  panX: 0,
  panY: 0,
  setZoom: (zoom) =>
    set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),

  // ─── Selection ──────────────────────────────────────
  selectedIds: [],
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),

  // ─── Elements (local mirror of Yjs data) ────────────
  elements: [],
  setElements: (elements) => set({ elements }),

  // ─── Undo / Redo ────────────────────────────────────
  // These are driven by Yjs undo manager, stored here for UI reactivity
  canUndo: false,
  canRedo: false,
  setCanUndo: (v) => set({ canUndo: v }),
  setCanRedo: (v) => set({ canRedo: v }),

}));

export default useCanvasStore;
