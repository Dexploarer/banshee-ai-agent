import React from 'react';
import './globals.css';

export function DebugApp() {
  const [count, setCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log('DebugApp mounted');

    // Check Tauri availability
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      console.log('Tauri is available');
      try {
        // Try to access Tauri APIs
        const tauri = (window as { __TAURI__?: unknown }).__TAURI__;
        console.log('Tauri APIs:', Object.keys(tauri as Record<string, unknown>));
      } catch (e) {
        console.error('Error accessing Tauri:', e);
        setError(`Tauri error: ${e}`);
      }
    } else {
      console.warn('Tauri not found');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">Banshee Debug</h1>
      <p className="text-gray-300 mb-8">React is working! Count: {count}</p>

      <button
        type="button"
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
      >
        Increment: {count}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-900 rounded">
          <p>Error: {error}</p>
        </div>
      )}

      <div className="mt-8 p-4 border border-gray-700 rounded">
        <h2 className="text-xl mb-2">Debug Info:</h2>
        <pre className="text-xs">
          {JSON.stringify(
            {
              userAgent: navigator.userAgent,
              href: window.location.href,
              tauriAvailable: typeof window !== 'undefined' && '__TAURI__' in window,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
