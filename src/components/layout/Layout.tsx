import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { Navigation } from './Navigation';
import { EnhancedTitleBar } from './EnhancedTitleBar';
import { CommandPalette } from '../CommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Add command palette shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      {/* Enhanced title bar with menu */}
      <EnhancedTitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <Navigation />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto h-full p-6">{children}</div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </div>
  );
}
