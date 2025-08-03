import React from 'react';
import ReactDOM from 'react-dom/client';
import { DebugApp } from './DebugApp';
import './globals.css';

console.log('main-debug.tsx loaded');

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('Initializing debug app...');
  const root = document.getElementById('root');

  if (!root) {
    console.error('Root element not found!');
    return;
  }

  console.log('Root element found:', root);

  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <DebugApp />
      </React.StrictMode>
    );
    console.log('Debug app rendered');
  } catch (error) {
    console.error('Error rendering debug app:', error);
  }
}
