import type { ReactNode } from 'react';
import { Navigation } from './Navigation';
import { TitleBar } from './TitleBar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen flex-col">
      {/* Custom title bar for Tauri */}
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <Navigation />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto h-full p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
