import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { logErrorToDB } from './lib/errorLogger';

// Global error handlers
window.addEventListener('error', (event) => {
  logErrorToDB(event.error || new Error(event.message), 'WindowGlobalError', 'critical');
});

window.addEventListener('unhandledrejection', (event) => {
  logErrorToDB(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), 'UnhandledPromiseRejection', 'critical');
});

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
