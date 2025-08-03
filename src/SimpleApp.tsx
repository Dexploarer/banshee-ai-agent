import './globals.css';

export function SimpleApp() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">Banshee Test</h1>
      <p className="text-gray-300 mb-8">If you can see this, React is working!</p>

      <div className="space-y-4">
        <div className="p-4 bg-blue-600 rounded">
          <p>Tailwind CSS Test - Blue Background</p>
        </div>

        <div className="p-4 bg-green-600 rounded">
          <p>Tailwind CSS Test - Green Background</p>
        </div>

        <div className="p-4 border border-gray-600 rounded">
          <h2 className="text-xl mb-2">Environment Info:</h2>
          <ul className="list-disc list-inside text-sm">
            <li>Window: {typeof window !== 'undefined' ? 'Available' : 'Not available'}</li>
            <li>
              Tauri:{' '}
              {typeof window !== 'undefined' && '__TAURI__' in window
                ? 'Available'
                : 'Not available'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
