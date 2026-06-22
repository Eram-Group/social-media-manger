import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// The browser-side mock server (Mock Service Worker). Started from main.tsx only
// when VITE_ENABLE_MSW=true (mock mode).
export const worker = setupWorker(...handlers);
