import { useEffect } from 'react';
import './globals.css';

function AppSimple() {
  useEffect(() => {
    console.log('AppSimple mounted');
    console.log('Tauri available:', '__TAURI__' in window);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">Banshee</h1>
      <p className="text-gray-300">Loading application...</p>

      <div className="mt-8 p-4 border border-gray-700 rounded">
        <h2 className="text-xl mb-2">Status:</h2>
        <ul className="list-disc list-inside text-sm">
          <li>React: ✓ Working</li>
          <li>Tailwind CSS: ✓ Working</li>
          <li>
            Tauri:{' '}
            {typeof window !== 'undefined' && (window as { __TAURI__?: unknown }).__TAURI__
              ? '✓ Available'
              : '✗ Not available'}
          </li>
        </ul>
      </div>
    </div>
  );
}

export default AppSimple;
