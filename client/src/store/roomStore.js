import { create } from 'zustand';
import { generateRandomName } from '../constants';

// Persist user name and session ID across refreshes per tab session
function getOrCreateUserName() {
  let name = sessionStorage.getItem('canvas_userName');
  if (!name) {
    name = generateRandomName();
    sessionStorage.setItem('canvas_userName', name);
  }
  return name;
}

function getOrCreateSessionId() {
  let id = sessionStorage.getItem('canvas_sessionId');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('canvas_sessionId', id);
  }
  return id;
}

const useRoomStore = create((set) => ({
  // ─── Room Connection ────────────────────────────────
  roomId: null,
  roomName: null,
  token: null,
  joined: false,

  setRoom: (roomId, roomName, token) => {
    localStorage.setItem('canvas_roomId', roomId);
    localStorage.setItem('canvas_roomName', roomName);
    localStorage.setItem('canvas_token', token);
    set({ roomId, roomName, token, joined: true });
  },

  leaveRoom: () => {
    localStorage.removeItem('canvas_roomId');
    localStorage.removeItem('canvas_roomName');
    localStorage.removeItem('canvas_token');
    set({ roomId: null, roomName: null, token: null, joined: false });
  },

  // Try to restore session from localStorage
  tryRestore: () => {
    const roomId = localStorage.getItem('canvas_roomId');
    const roomName = localStorage.getItem('canvas_roomName');
    const token = localStorage.getItem('canvas_token');
    if (roomId && roomName && token) {
      set({ roomId, roomName, token, joined: true });
      return true;
    }
    return false;
  },

  // ─── User Identity ──────────────────────────────────
  userName: getOrCreateUserName(),
  sessionId: getOrCreateSessionId(),

  // ─── Connected Users (from awareness) ───────────────
  connectedUsers: [],
  setConnectedUsers: (users) => set({ connectedUsers: users }),

  // ─── Toast Notifications ────────────────────────────
  toast: null,
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => {
      set((state) => {
        if (state.toast?.message === message) {
          return { toast: null };
        }
        return {};
      });
    }, 4000);
  },
  hideToast: () => set({ toast: null }),
}));

export default useRoomStore;
