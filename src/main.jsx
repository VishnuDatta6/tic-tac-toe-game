import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App.jsx';
import { GameSessionProvider } from './context/GameSessionContext.jsx';
import './index.css';

async function enableMocking() {
  // Enable the mock API in dev and in local preview builds. Set VITE_ENABLE_MOCK
  // explicitly to force it on/off in other environments.
  const flag = import.meta.env.VITE_ENABLE_MOCK;
  const shouldMock = flag === 'true' || (flag !== 'false' && import.meta.env.DEV);

  if (!shouldMock) return;

  const { worker } = await import('./mocks/browser.js');
  // Service worker lives in public/ and is served under Vite's base path.
  const base = import.meta.env.BASE_URL || '/';
  return worker.start({
    serviceWorker: { url: `${base}mockServiceWorker.js` },
    onUnhandledRequest: 'bypass',
  });
}

enableMocking().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <GameSessionProvider>
        <App />
      </GameSessionProvider>
    </StrictMode>
  );
});


