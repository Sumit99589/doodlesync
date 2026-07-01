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
  const toast = useRoomStore((s) => s.toast);
  const hideToast = useRoomStore((s) => s.hideToast);

  useEffect(() => {
    tryRestore();
  }, []);

  return (
    <>
      {!joined ? <LandingPage /> : <AppContent />}

      {toast && (
        <div className="toast-container">
          <div className={`toast-box toast-box-${toast.type}`}>
            <span>{toast.message}</span>
            <button className="toast-close" onClick={hideToast}>✕</button>
          </div>
        </div>
      )}
    </>
  );
}
