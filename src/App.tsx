import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { Toaster } from './components/ui/toast';
import { initDatabase } from './lib/database';
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
  const theme = useThemeStore((state) => state.theme);
  const systemTheme = useThemeStore((state) => state.systemTheme);

  useEffect(() => {
    // Initialize database
    initDatabase().catch(console.error);

    // Initialize theme on mount
    const effectiveTheme = theme === 'system' ? systemTheme : theme;
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
