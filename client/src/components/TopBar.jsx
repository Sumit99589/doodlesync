import useCanvasStore from '../store/canvasStore';
import useRoomStore from '../store/roomStore';
import { getUndoManager } from '../lib/yjs';
import { MIN_STROKE_WIDTH, MAX_STROKE_WIDTH } from '../constants';

export default function TopBar() {
  const strokeColor = useCanvasStore((s) => s.strokeColor);
  const fillColor = useCanvasStore((s) => s.fillColor);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);
  const opacity = useCanvasStore((s) => s.opacity);
  const canUndo = useCanvasStore((s) => s.canUndo);
  const canRedo = useCanvasStore((s) => s.canRedo);
  const setStrokeColor = useCanvasStore((s) => s.setStrokeColor);
  const setFillColor = useCanvasStore((s) => s.setFillColor);
  const setStrokeWidth = useCanvasStore((s) => s.setStrokeWidth);
  const setOpacity = useCanvasStore((s) => s.setOpacity);
  const roomName = useRoomStore((s) => s.roomName);
  const leaveRoom = useRoomStore((s) => s.leaveRoom);

  const handleUndo = () => {
    const um = getUndoManager();
    if (um) um.undo();
  };

  const handleRedo = () => {
    const um = getUndoManager();
    if (um) um.redo();
  };

  return (
    <div className="topbar">
      {/* Room name */}
      <div className="topbar-section">
        <span className="topbar-room-name">{roomName}</span>
        <button className="topbar-leave-btn" onClick={leaveRoom} title="Leave room">
          ✕
        </button>
      </div>

      {/* Divider */}
      <div className="topbar-divider" />

      {/* Stroke color */}
      <div className="topbar-section">
        <label className="topbar-label" title="Stroke color">
          <span className="topbar-label-text">Stroke</span>
          <div className="topbar-color-swatch" style={{ backgroundColor: strokeColor }}>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="topbar-color-input"
            />
          </div>
        </label>
      </div>

      {/* Fill color */}
      <div className="topbar-section">
        <label className="topbar-label" title="Fill color">
          <span className="topbar-label-text">Fill</span>
          <div
            className="topbar-color-swatch topbar-fill-swatch"
            style={{
              backgroundColor: fillColor === 'transparent' ? 'transparent' : fillColor,
            }}
          >
            <input
              type="color"
              value={fillColor === 'transparent' ? '#000000' : fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              className="topbar-color-input"
            />
          </div>
          <button
            className="topbar-no-fill-btn"
            onClick={() => setFillColor('transparent')}
            title="No fill"
          >
            ∅
          </button>
        </label>
      </div>

      <div className="topbar-divider" />

      {/* Stroke width */}
      <div className="topbar-section">
        <label className="topbar-label" title="Stroke width">
          <span className="topbar-label-text">Width</span>
          <input
            type="range"
            min={MIN_STROKE_WIDTH}
            max={MAX_STROKE_WIDTH}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="topbar-slider"
          />
          <span className="topbar-value">{strokeWidth}px</span>
        </label>
      </div>

      {/* Opacity */}
      <div className="topbar-section">
        <label className="topbar-label" title="Opacity">
          <span className="topbar-label-text">Opacity</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="topbar-slider"
          />
          <span className="topbar-value">{Math.round(opacity * 100)}%</span>
        </label>
      </div>

      <div className="topbar-divider" />

      {/* Undo / Redo */}
      <div className="topbar-section">
        <button
          className="topbar-action-btn"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          className="topbar-action-btn"
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷
        </button>
      </div>
    </div>
  );
}
