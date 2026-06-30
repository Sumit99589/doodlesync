import { useEffect } from 'react';
import useRoomStore from './store/roomStore';
import { useYjsSync } from './hooks/useYjsSync';
import LandingPage from './components/LandingPage';
import Canvas from './components/Canvas';

function AppContent() {
  useYjsSync();
  return <Canvas />;
}

export default function App() {
  const joined = useRoomStore((s) => s.joined);
  const tryRestore = useRoomStore((s) => s.tryRestore);

  useEffect(() => {
    tryRestore();
  }, []);

  if (!joined) {
    return <LandingPage />;
  }

  return <AppContent />;
}
