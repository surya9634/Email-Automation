import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and ignore benign WebSocket / HMR disconnect errors which are expected in this container environment.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason);
    if (reason && (reason.includes('WebSocket') || reason.includes('websocket') || reason.includes('vite') || reason.includes('HMR'))) {
      event.preventDefault();
      console.warn('Suppressed benign HMR/WebSocket rejection:', reason);
    }
  });

  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (message.includes('WebSocket') || message.includes('websocket') || message.includes('vite') || message.includes('HMR')) {
      event.preventDefault();
      console.warn('Suppressed benign HMR/WebSocket error:', message);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
