import { useRef, useEffect, useCallback, useState } from 'react';
import useCanvasStore from '../store/canvasStore';
import { renderCanvas } from '../lib/renderer';
import {
  createElement,
  updateElement,
  finalizePenElement,
  hitTest,
  getResizeHandle,
  getBoundingBox,
} from '../lib/elements';
import {
  getElementsArray,
  getYDoc,
  getUndoManager,
  updateCursor,
} from '../lib/yjs';
import { TOOLS, KEY_TO_TOOL, ZOOM_STEP, MIN_ZOOM, MAX_ZOOM } from '../constants';
import Toolbar from './Toolbar';
import TopBar from './TopBar';
import PresenceBar from './PresenceBar';
import CursorOverlay from './CursorOverlay';
import ChatPanel from './ChatPanel';

export default function Canvas() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const dirtyRef = useRef(true);

  const tool = useCanvasStore((s) => s.tool);
  const setTool = useCanvasStore((s) => s.setTool);
  const zoom = useCanvasStore((s) => s.zoom);
  const panX = useCanvasStore((s) => s.panX);
  const panY = useCanvasStore((s) => s.panY);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const setPan = useCanvasStore((s) => s.setPan);
  const elements = useCanvasStore((s) => s.elements);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const setSelectedIds = useCanvasStore((s) => s.setSelectedIds);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const strokeColor = useCanvasStore((s) => s.strokeColor);
  const fillColor = useCanvasStore((s) => s.fillColor);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);
  const opacity = useCanvasStore((s) => s.opacity);

  // ─── Drawing State (local, not in Zustand) ──────────
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const drawStateRef = useRef({
    activeElement: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    dragOffsets: [],
    resizeHandle: null,
    resizeStartBB: null,
    selectionRect: null,
    spaceDown: false,
    arrowStarted: false,
  });

  // ─── Screen → World coordinate transform ───────────
  const screenToWorld = useCallback(
    (clientX, clientY) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - panX) / zoom,
        y: (sy - panY) / zoom,
      };
    },
    [zoom, panX, panY]
  );

  // ─── Resize canvas to fill container ────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      dirtyRef.current = true;
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // ─── Render loop ────────────────────────────────────
  useEffect(() => {
    dirtyRef.current = true;
  }, [elements, selectedIds, zoom, panX, panY]);

  useEffect(() => {
    const loop = () => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          const dpr = window.devicePixelRatio || 1;
          renderCanvas(ctx, {
            width: canvas.width / dpr,
            height: canvas.height / dpr,
            zoom,
            panX,
            panY,
            elements,
            selectedIds,
            activePreview: drawStateRef.current.activeElement,
          });
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [zoom, panX, panY, elements, selectedIds]);

  // ─── Keyboard shortcuts ─────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't capture shortcuts when typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Tool shortcuts
      const mappedTool = KEY_TO_TOOL[e.key.toLowerCase()];
      if (mappedTool) {
        setTool(mappedTool);
        return;
      }

      // Space for panning
      if (e.key === ' ' && !drawStateRef.current.spaceDown) {
        e.preventDefault();
        drawStateRef.current.spaceDown = true;
      }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        deleteSelected();
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const um = getUndoManager();
        if (um) um.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        const um = getUndoManager();
        if (um) um.redo();
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === ' ') {
        drawStateRef.current.spaceDown = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedIds, setTool]);

  // ─── Delete selected elements ───────────────────────
  const deleteSelected = useCallback(() => {
    const yArr = getElementsArray();
    const ydoc = getYDoc();
    if (!yArr || !ydoc) return;

    ydoc.transact(() => {
      // Delete in reverse index order to preserve indices
      const indices = [];
      for (let i = 0; i < yArr.length; i++) {
        const el = yArr.get(i);
        if (selectedIds.includes(el.id)) {
          indices.push(i);
        }
      }
      for (let i = indices.length - 1; i >= 0; i--) {
        yArr.delete(indices[i], 1);
      }
    });

    clearSelection();
  }, [selectedIds, clearSelection]);

  // ─── Mouse Down ─────────────────────────────────────
  const handleMouseDown = useCallback(
    (e) => {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      const ds = drawStateRef.current;

      // Middle mouse or Space+click → pan
      if (e.button === 1 || (e.button === 0 && ds.spaceDown)) {
        setIsPanning(true);
        ds.startX = e.clientX;
        ds.startY = e.clientY;
        ds.lastX = panX;
        ds.lastY = panY;
        return;
      }

      if (e.button !== 0) return;

      // Tool-specific actions
      switch (tool) {
        case TOOLS.SELECT: {
          // Check for resize handles on selected elements
          if (selectedIds.length === 1) {
            const selectedEl = elements.find((el) => el.id === selectedIds[0]);
            if (selectedEl) {
              const handle = getResizeHandle(selectedEl, x, y, zoom);
              if (handle) {
                setIsResizing(true);
                ds.resizeHandle = handle;
                ds.resizeStartBB = getBoundingBox(selectedEl);
                ds.startX = x;
                ds.startY = y;
                return;
              }
            }
          }

          // Check if clicking on an element (skip hidden & locked)
          let hitElement = null;
          for (let i = elements.length - 1; i >= 0; i--) {
            if (elements[i].hidden || elements[i].locked) continue;
            if (hitTest(elements[i], x, y, zoom)) {
              hitElement = elements[i];
              break;
            }
          }

          if (hitElement) {
            if (!selectedIds.includes(hitElement.id)) {
              setSelectedIds([hitElement.id]);
            }
            // Start dragging
            setIsDragging(true);
            ds.startX = x;
            ds.startY = y;
            const selected = elements.filter((el) => selectedIds.includes(el.id) || el.id === hitElement.id);
            ds.dragOffsets = selected.map((el) => ({
              id: el.id,
              offsetX: el.x - x,
              offsetY: el.y - y,
            }));
          } else {
            clearSelection();
            // Start selection rectangle
            setIsSelecting(true);
            ds.startX = x;
            ds.startY = y;
            ds.selectionRect = { x, y, width: 0, height: 0 };
          }
          break;
        }

        case TOOLS.RECTANGLE:
        case TOOLS.ELLIPSE: {
          const count = elements.filter((el) => el.type === tool).length;
          const label = tool.charAt(0).toUpperCase() + tool.slice(1);
          const newEl = createElement(tool, x, y, {
            strokeColor,
            fillColor,
            strokeWidth,
            opacity,
            name: `${label} ${count + 1}`,
          });
          ds.activeElement = newEl;
          ds.startX = x;
          ds.startY = y;
          setIsDrawing(true);
          break;
        }

        case TOOLS.ARROW: {
          if (!ds.arrowStarted) {
            // First click — set start point
            const count = elements.filter((el) => el.type === 'arrow').length;
            const newEl = createElement('arrow', x, y, {
              strokeColor,
              fillColor,
              strokeWidth,
              opacity,
              endX: x,
              endY: y,
              name: `Arrow ${count + 1}`,
            });
            ds.activeElement = newEl;
            ds.arrowStarted = true;
            setIsDrawing(true);
          } else {
            // Second click — finalize
            if (ds.activeElement) {
              ds.activeElement = updateElement(ds.activeElement, {
                points: [ds.activeElement.points[0], { x, y }],
              });
              commitElement(ds.activeElement);
              ds.activeElement = null;
              ds.arrowStarted = false;
              setIsDrawing(false);
            }
          }
          break;
        }

        case TOOLS.PEN: {
          const count = elements.filter((el) => el.type === 'pen').length;
          const newEl = createElement('pen', x, y, {
            strokeColor,
            fillColor: 'transparent',
            strokeWidth,
            opacity,
            name: `Path ${count + 1}`,
          });
          ds.activeElement = newEl;
          setIsDrawing(true);
          break;
        }

        case TOOLS.TEXT: {
          const count = elements.filter((el) => el.type === 'text').length;
          const newEl = createElement('text', x, y, {
            strokeColor,
            fillColor: 'transparent',
            strokeWidth,
            opacity,
            text: 'Text',
            name: `Text ${count + 1}`,
          });
          commitElement(newEl);
          setSelectedIds([newEl.id]);
          break;
        }

        case TOOLS.ERASER: {
          setIsDrawing(true);
          // Delete the topmost element under cursor (skip hidden & locked)
          for (let i = elements.length - 1; i >= 0; i--) {
            if (elements[i].hidden || elements[i].locked) continue;
            if (hitTest(elements[i], x, y, zoom)) {
              const yArr = getElementsArray();
              const ydoc = getYDoc();
              if (yArr && ydoc) {
                ydoc.transact(() => {
                  for (let j = 0; j < yArr.length; j++) {
                    if (yArr.get(j).id === elements[i].id) {
                      yArr.delete(j, 1);
                      break;
                    }
                  }
                });
              }
              break;
            }
          }
          break;
        }
      }
    },
    [tool, zoom, panX, panY, elements, selectedIds, strokeColor, fillColor, strokeWidth, opacity, screenToWorld, clearSelection, setSelectedIds]
  );

  // ─── Mouse Move ─────────────────────────────────────
  const handleMouseMove = useCallback(
    (e) => {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      const ds = drawStateRef.current;

      // Update awareness cursor
      updateCursor(x, y);

      // Panning
      if (isPanning) {
        const dx = e.clientX - ds.startX;
        const dy = e.clientY - ds.startY;
        setPan(ds.lastX + dx, ds.lastY + dy);
        dirtyRef.current = true;
        return;
      }

      // Dragging selected elements
      if (isDragging && ds.dragOffsets.length > 0) {
        const yArr = getElementsArray();
        const ydoc = getYDoc();
        if (!yArr || !ydoc) return;

        ydoc.transact(() => {
          for (const offset of ds.dragOffsets) {
            for (let i = 0; i < yArr.length; i++) {
              const el = yArr.get(i);
              if (el.id === offset.id) {
                const updated = updateElement(el, {
                  x: x + offset.offsetX,
                  y: y + offset.offsetY,
                });
                yArr.delete(i, 1);
                yArr.insert(i, [updated]);
                break;
              }
            }
          }
        });

        dirtyRef.current = true;
        return;
      }

      // Resizing
      if (isResizing && selectedIds.length === 1) {
        const yArr = getElementsArray();
        const ydoc = getYDoc();
        if (!yArr || !ydoc) return;

        const dx = x - ds.startX;
        const dy = y - ds.startY;
        const bb = ds.resizeStartBB;

        let newX = bb.x, newY = bb.y, newW = bb.width, newH = bb.height;

        if (ds.resizeHandle.includes('e')) { newW = bb.width + dx; }
        if (ds.resizeHandle.includes('w')) { newX = bb.x + dx; newW = bb.width - dx; }
        if (ds.resizeHandle.includes('s')) { newH = bb.height + dy; }
        if (ds.resizeHandle.includes('n')) { newY = bb.y + dy; newH = bb.height - dy; }

        ydoc.transact(() => {
          for (let i = 0; i < yArr.length; i++) {
            const el = yArr.get(i);
            if (el.id === selectedIds[0]) {
              const updated = updateElement(el, {
                x: newX,
                y: newY,
                width: Math.abs(newW),
                height: Math.abs(newH),
              });
              yArr.delete(i, 1);
              yArr.insert(i, [updated]);
              break;
            }
          }
        });

        dirtyRef.current = true;
        return;
      }

      // Selection rectangle
      if (isSelecting) {
        ds.selectionRect = {
          x: Math.min(ds.startX, x),
          y: Math.min(ds.startY, y),
          width: Math.abs(x - ds.startX),
          height: Math.abs(y - ds.startY),
        };
        dirtyRef.current = true;
        return;
      }

      // Drawing shapes or Erasing
      if (isDrawing) {
        if (tool === TOOLS.ERASER) {
          // Delete elements under cursor as we drag (skip hidden & locked)
          for (let i = elements.length - 1; i >= 0; i--) {
            if (elements[i].hidden || elements[i].locked) continue;
            if (hitTest(elements[i], x, y, zoom)) {
              const yArr = getElementsArray();
              const ydoc = getYDoc();
              if (yArr && ydoc) {
                ydoc.transact(() => {
                  for (let j = 0; j < yArr.length; j++) {
                    if (yArr.get(j).id === elements[i].id) {
                      yArr.delete(j, 1);
                      break;
                    }
                  }
                });
              }
              break;
            }
          }
          return;
        }

        if (ds.activeElement) {
          switch (ds.activeElement.type) {
            case 'rectangle':
            case 'ellipse': {
              ds.activeElement = updateElement(ds.activeElement, {
                x: Math.min(ds.startX, x),
                y: Math.min(ds.startY, y),
                width: Math.abs(x - ds.startX),
                height: Math.abs(y - ds.startY),
              });
              break;
            }
            case 'arrow': {
              ds.activeElement = updateElement(ds.activeElement, {
                points: [ds.activeElement.points[0], { x, y }],
              });
              break;
            }
            case 'pen': {
              const pts = [...ds.activeElement.points, { x, y }];
              ds.activeElement = updateElement(ds.activeElement, { points: pts });
              break;
            }
          }
          dirtyRef.current = true;
        }
      }
    },
    [isPanning, isDragging, isResizing, isSelecting, isDrawing, tool, elements, zoom, panX, panY, selectedIds, screenToWorld, setPan]
  );

  // ─── Mouse Up ───────────────────────────────────────
  const handleMouseUp = useCallback(
    () => {
      const ds = drawStateRef.current;

      if (isPanning) {
        setIsPanning(false);
        return;
      }

      if (isDragging) {
        setIsDragging(false);
        ds.dragOffsets = [];
        return;
      }

      if (isResizing) {
        setIsResizing(false);
        ds.resizeHandle = null;
        ds.resizeStartBB = null;
        return;
      }

      if (isSelecting) {
        // Multi-select elements within the selection rectangle
        const rect = ds.selectionRect;
        if (rect && rect.width > 2 && rect.height > 2) {
          const ids = elements
            .filter((el) => {
              if (el.hidden || el.locked) return false;
              const bb = getBoundingBox(el);
              // Select if bounding box intersects the selection rectangle
              return (
                bb.x + bb.width >= rect.x &&
                bb.x <= rect.x + rect.width &&
                bb.y + bb.height >= rect.y &&
                bb.y <= rect.y + rect.height
              );
            })
            .map((el) => el.id);
          setSelectedIds(ids);
        }
        setIsSelecting(false);
        ds.selectionRect = null;
        return;
      }

      if (isDrawing) {
        if (ds.activeElement) {
          // Arrow uses click-click pattern, not drag
          if (ds.activeElement.type === 'arrow') return;

          // Finalize pen with Chaikin smoothing
          let finalEl = ds.activeElement;
          if (finalEl.type === 'pen') {
            finalEl = finalizePenElement(finalEl);
          }

          commitElement(finalEl);
          ds.activeElement = null;
        }
        setIsDrawing(false);
      }
    },
    [isPanning, isDragging, isResizing, isSelecting, isDrawing, elements, setSelectedIds]
  );

  // ─── Commit an element to the shared Yjs array ─────
  const commitElement = useCallback((element) => {
    const yArr = getElementsArray();
    if (!yArr) return;
    yArr.push([element]);
  }, []);

  // ─── Scroll to zoom ────────────────────────────────
  const handleWheel = useCallback(
    (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));

        // Zoom towards cursor position
        const rect = canvasRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const newPanX = mx - ((mx - panX) / zoom) * newZoom;
        const newPanY = my - ((my - panY) / zoom) * newZoom;

        setZoom(newZoom);
        setPan(newPanX, newPanY);
        dirtyRef.current = true;
      }
    },
    [zoom, panX, panY, setZoom, setPan]
  );

  // Prevent browser zoom on canvas
  useEffect(() => {
    const canvas = containerRef.current;
    if (!canvas) return;
    const prevent = (e) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    canvas.addEventListener('wheel', prevent, { passive: false });
    return () => canvas.removeEventListener('wheel', prevent);
  }, []);

  // ─── Inline text editing ────────────────────────────
  const handleDoubleClick = useCallback(
    (e) => {
      if (tool !== TOOLS.SELECT) return;
      const { x, y } = screenToWorld(e.clientX, e.clientY);

      for (let i = elements.length - 1; i >= 0; i--) {
        if (elements[i].type === 'text' && hitTest(elements[i], x, y, zoom)) {
          const el = elements[i];
          const newText = prompt('Edit text:', el.text);
          if (newText !== null) {
            const yArr = getElementsArray();
            const ydoc = getYDoc();
            if (yArr && ydoc) {
              ydoc.transact(() => {
                for (let j = 0; j < yArr.length; j++) {
                  if (yArr.get(j).id === el.id) {
                    const updated = updateElement(el, { text: newText });
                    yArr.delete(j, 1);
                    yArr.insert(j, [updated]);
                    break;
                  }
                }
              });
            }
          }
          break;
        }
      }
    },
    [tool, elements, zoom, screenToWorld]
  );

  // ─── Zoom Controls ─────────────────────────────────
  const zoomIn = () => {
    setZoom(Math.min(MAX_ZOOM, zoom + ZOOM_STEP));
    dirtyRef.current = true;
  };

  const zoomOut = () => {
    setZoom(Math.max(MIN_ZOOM, zoom - ZOOM_STEP));
    dirtyRef.current = true;
  };

  const getCursorStyle = () => {
    if (isPanning || drawStateRef.current.spaceDown) return 'grab';
    switch (tool) {
      case TOOLS.SELECT: return 'default';
      case TOOLS.ERASER: return 'crosshair';
      case TOOLS.TEXT: return 'text';
      default: return 'crosshair';
    }
  };

  return (
    <div className="canvas-layout">
      <TopBar />
      <Toolbar />
      <PresenceBar />

      <div
        ref={containerRef}
        className="canvas-container"
        style={{ cursor: getCursorStyle() }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
        />
        <CursorOverlay />

        {/* Zoom controls */}
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={zoomOut} title="Zoom out">−</button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button className="zoom-btn" onClick={zoomIn} title="Zoom in">+</button>
        </div>
      </div>

      <ChatPanel />
    </div>
  );
}
