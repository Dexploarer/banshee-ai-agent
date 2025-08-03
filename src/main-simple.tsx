import React from 'react';
import ReactDOM from 'react-dom/client';
import { SimpleApp } from './SimpleApp';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <SimpleApp />
    </React.StrictMode>
  );
}
