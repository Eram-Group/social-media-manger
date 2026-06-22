import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Start the mock server (MSW) only in mock mode (VITE_ENABLE_MSW=true).
async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') return;
  const { worker } = await import('@/mock-server/browser');
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
