import useCanvasStore from '../store/canvasStore';
import { TOOL_LIST } from '../constants';

export default function Toolbar() {
  const tool = useCanvasStore((s) => s.tool);
  const setTool = useCanvasStore((s) => s.setTool);

  return (
    <div className="toolbar">
      {TOOL_LIST.map((t) => (
        <button
          key={t.id}
          className={`toolbar-btn ${tool === t.id ? 'toolbar-btn-active' : ''}`}
          onClick={() => setTool(t.id)}
          title={`${t.label} (${t.key})`}
        >
          <span className="toolbar-btn-icon">{t.icon}</span>
          <span className="toolbar-btn-key">{t.key}</span>
        </button>
      ))}
    </div>
  );
}
