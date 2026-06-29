import { useState } from 'react';
import useRoomStore from '../store/roomStore';

export default function JoinRoom() {
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setRoom = useRoomStore((s) => s.setRoom);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomName.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: roomName.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to join room');
        setLoading(false);
        return;
      }

      setRoom(data.roomId, roomName.trim(), data.token);
    } catch (err) {
      setError('Connection failed. Is the server running?');
      setLoading(false);
    }
  };

  return (
    <div className="join-root">
      {/* Animated background orbs */}
      <div className="join-bg-orb join-bg-orb-1" />
      <div className="join-bg-orb join-bg-orb-2" />
      <div className="join-bg-orb join-bg-orb-3" />

      <div className="join-card">
        {/* Logo */}
        <div className="join-logo">
          <div className="join-logo-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="2" width="28" height="28" rx="6" stroke="url(#logo-grad)" strokeWidth="2.5" />
              <path d="M10 22L14 10L18 18L22 12" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="logo-grad" x1="2" y1="2" x2="30" y2="30">
                  <stop stopColor="#818cf8" />
                  <stop offset="1" stopColor="#c084fc" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="join-title">Collaborative Canvas</h1>
          <p className="join-subtitle">Draw together in real-time. No signup needed.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="join-form">
          <div className="join-field">
            <label htmlFor="roomName">Room Name</label>
            <input
              id="roomName"
              type="text"
              placeholder="e.g. Design Sprint"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="join-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Room password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="join-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="join-button" disabled={loading}>
            {loading ? (
              <span className="join-spinner" />
            ) : (
              'Join Room'
            )}
          </button>
        </form>

        <p className="join-hint">
          First to join creates the room. Share the name & password with collaborators.
        </p>
      </div>
    </div>
  );
}
