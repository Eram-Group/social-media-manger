'use client';

import { useEffect } from 'react';

// Starts the Mock Service Worker only in mock mode (NEXT_PUBLIC_ENABLE_MSW=true).
// In normal mode this is a no-op; screens read the in-memory fixtures directly.
export default function MswInit() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_MSW !== 'true') return;
    let active = true;
    (async () => {
      const { worker } = await import('@/mock-server/browser');
      if (!active) return;
      worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: { url: '/mockServiceWorker.js' },
      });
    })();
    return () => {
      active = false;
    };
  }, []);
  return null;
}
