import { useState } from 'react';
import useRoomStore from '../store/roomStore';

/**
 * Extracted join-room form logic.
 * Handles room name, password, API call, token storage, and navigation.
 */
export default function useJoinRoom() {
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('join'); // 'join' or 'create'
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
        body: JSON.stringify({ roomName: roomName.trim(), password, action }),
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

  return {
    roomName,
    setRoomName,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    loading,
    action,
    setAction,
    handleSubmit,
  };
}
