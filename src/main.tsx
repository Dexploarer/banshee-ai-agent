import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import App from './AppSimple';
import './globals.css';

console.log('main.tsx loaded');
console.log('Document state:', document.readyState);
console.log('Root element:', document.getElementById('root'));
console.log('Window location:', window.location.href);
console.log('Tauri available:', typeof window !== 'undefined' && '__TAURI__' in window);

try {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  console.log('App rendered successfully');
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; color: red;">
      <h1>Error Loading Banshee</h1>
      <pre>${error}</pre>
    </div>
  `;
}
