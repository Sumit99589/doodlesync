import useRoomStore from '../store/roomStore';

export default function PresenceBar() {
  const connectedUsers = useRoomStore((s) => s.connectedUsers);
  const sessionId = useRoomStore((s) => s.sessionId);

  return (
    <div className="presence-bar">
      {connectedUsers.map((user) => (
        <div
          key={user.clientId}
          className="presence-avatar"
          title={user.name || 'Anonymous'}
          style={{ borderColor: user.color }}
        >
          <span className="presence-avatar-text">
            {(user.name || '?')[0].toUpperCase()}
          </span>
          {user.sessionId === sessionId && (
            <span className="presence-you-badge">you</span>
          )}
        </div>
      ))}
      {connectedUsers.length > 0 && (
        <span className="presence-count">
          {connectedUsers.length} online
        </span>
      )}
    </div>
  );
}
