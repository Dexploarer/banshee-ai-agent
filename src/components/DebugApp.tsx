import { useEffect, useState } from 'react';

export function DebugApp() {
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
    console.log('DebugApp mounted');

    // Check if CSS is loaded
    const styles = window.getComputedStyle(document.body);
    console.log('Background color:', styles.backgroundColor);
    console.log('Color:', styles.color);

    // Check if Tailwind is working
    const testDiv = document.createElement('div');
    testDiv.className = 'bg-red-500';
    document.body.appendChild(testDiv);
    const testStyles = window.getComputedStyle(testDiv);
    console.log('Test div background:', testStyles.backgroundColor);
    document.body.removeChild(testDiv);

    // Check for errors
    window.addEventListener('error', (e) => {
      console.error('Window error:', e);
      setError(e.message);
    });
  }, []);

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#1a1a1a',
        color: 'white',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Banshee Debug</h1>
      <p>App loaded: {loaded ? 'Yes' : 'No'}</p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <div style={{ marginTop: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Environment</h2>
        <ul>
          <li>Window: {typeof window !== 'undefined' ? 'Available' : 'Not available'}</li>
          <li>
            Tauri:{' '}
            {typeof (window as { __TAURI__?: unknown }).__TAURI__ !== 'undefined'
              ? 'Available'
              : 'Not available'}
          </li>
          <li>Document ready: {document.readyState}</li>
        </ul>
      </div>

      <div className="mt-8 p-4 bg-blue-500 text-white rounded">
        <p>Tailwind test - this should be blue with white text</p>
      </div>
    </div>
  );
}
