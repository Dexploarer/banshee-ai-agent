import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { Toaster } from './components/ui/toast';
import { initDatabase } from './lib/database';
import { initializeOAuthListener } from './lib/ai/providers/oauth-handler';
import { AgentsPortal } from './portals/agents/AgentsPortal';
import { ChatPortal } from './portals/chat/ChatPortal';
import { DashboardPortal } from './portals/dashboard/DashboardPortal';
import { MCPPortal } from './portals/mcp/MCPPortal';
import { SettingsPortal } from './portals/settings/SettingsPortal';
import { useThemeStore } from './store/themeStore';
import './globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  console.log('App component rendering');

  const theme = useThemeStore((state) => state.theme);
  const systemTheme = useThemeStore((state) => state.systemTheme);

  useEffect(() => {
    console.log('App useEffect running');

    // Initialize database with error handling
    initDatabase()
      .then(() => {
        console.log('Database initialized successfully');
      })
      .catch((error) => {
        console.error('Database init error:', error);
        // Don't let database errors prevent app from loading
      });

    // Initialize OAuth listener
    const unlistenOAuth = initializeOAuthListener()
      .then((unlisten) => {
        console.log('OAuth listener initialized');
        return unlisten;
      })
      .catch((error) => {
        console.error('OAuth listener init error:', error);
        return null;
      });

    // Initialize theme on mount
    const effectiveTheme = theme === 'system' ? systemTheme : theme;
    console.log('Theme:', theme, 'System theme:', systemTheme, 'Effective:', effectiveTheme);

    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Cleanup function
    return () => {
      unlistenOAuth.then((unlisten) => {
        if (unlisten) {
          unlisten();
        }
      });
    };
  }, [theme, systemTheme]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="h-screen bg-background text-foreground">
            <Layout>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<DashboardPortal />} />
                  <Route path="/dashboard" element={<DashboardPortal />} />
                  <Route path="/chat" element={<ChatPortal />} />
                  <Route path="/agents" element={<AgentsPortal />} />
                  <Route path="/settings" element={<SettingsPortal />} />
                  <Route path="/mcp" element={<MCPPortal />} />
                </Routes>
              </ErrorBoundary>
            </Layout>
            <Toaster />
          </div>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
