import useRoomStore from '../store/roomStore';
import useCanvasStore from '../store/canvasStore';

export default function CursorOverlay() {
  const connectedUsers = useRoomStore((s) => s.connectedUsers);
  const sessionId = useRoomStore((s) => s.sessionId);
  const zoom = useCanvasStore((s) => s.zoom);
  const panX = useCanvasStore((s) => s.panX);
  const panY = useCanvasStore((s) => s.panY);

  // Filter out local user and users without cursor data
  const remoteCursors = connectedUsers.filter(
    (u) => u.sessionId !== sessionId && u.cursor
  );

  return (
    <svg className="cursor-overlay">
      {remoteCursors.map((user) => {
        // Transform world coordinates to screen coordinates
        const screenX = user.cursor.x * zoom + panX;
        const screenY = user.cursor.y * zoom + panY;

        return (
          <g key={user.clientId} transform={`translate(${screenX}, ${screenY})`}>
            {/* Cursor pointer */}
            <path
              d="M0 0 L0 14 L4 10.5 L8 17 L10.5 15.5 L6.5 9 L11 8 Z"
              fill={user.color}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="0.5"
            />
            {/* Name label */}
            <g transform="translate(14, 12)">
              <rect
                x="-2"
                y="-10"
                width={Math.max(40, (user.name || '?').length * 7 + 8)}
                height="16"
                rx="4"
                fill={user.color}
                opacity="0.9"
              />
              <text
                x="2"
                y="2"
                fill="white"
                fontSize="10"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="500"
              >
                {user.name || 'Anonymous'}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
