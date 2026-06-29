import { create } from 'zustand';

const useChatStore = create((set) => ({
  chatOpen: true,
  lastSeenCount: 0,
  setChatOpen: (chatOpen) => set({ chatOpen }),
  setLastSeenCount: (lastSeenCount) => set({ lastSeenCount }),
}));

export default useChatStore;
