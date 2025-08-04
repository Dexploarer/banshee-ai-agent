/**
 * Safe Enhanced Title Bar with error handling
 *
 * Wraps window API calls in try-catch to prevent white screen
 */

import bansheeLogoTransparent from '@/assets/banshee-logo-transparent@2x.png';
import bansheeLogoWhite from '@/assets/banshee-logo-white@2x.png';
import { Button } from '@/components/ui/button';
import { Maximize, Minus, Square, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MenuBar } from './MenuBar';

// Safely import Tauri window API
let windowApi: typeof import('@tauri-apps/api/window') | null = null;
try {
  const tauriWindow = await import('@tauri-apps/api/window');
  windowApi = tauriWindow.getCurrentWindow();
} catch (error) {
  console.warn('Tauri window API not available:', error);
}

export function SafeEnhancedTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!windowApi) return;

    // Check initial window state
    windowApi
      .isMaximized()
      .then(setIsMaximized)
      .catch((err: unknown) => console.warn('Failed to check maximized state:', err));

    // Listen for window state changes
    let unlisten: (() => void) | null = null;

    windowApi
      .onResized(async () => {
        try {
          const maximized = await windowApi.isMaximized();
          setIsMaximized(maximized);
        } catch (err) {
          console.warn('Failed to check maximized state on resize:', err);
        }
      })
      .then((fn: () => void) => {
        unlisten = fn;
      })
      .catch((err: unknown) => console.warn('Failed to listen for resize:', err));

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleMinimize = async () => {
    if (!windowApi) return;
    try {
      await windowApi.minimize();
    } catch (err) {
      console.error('Failed to minimize:', err);
    }
  };

  const handleMaximize = async () => {
    if (!windowApi) return;
    try {
      if (isMaximized) {
        await windowApi.unmaximize();
      } else {
        await windowApi.maximize();
      }
    } catch (err) {
      console.error('Failed to maximize/unmaximize:', err);
    }
  };

  const handleClose = async () => {
    if (!windowApi) return;
    try {
      await windowApi.close();
    } catch (err) {
      console.error('Failed to close:', err);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Title Bar with Window Controls */}
      <div
        className="flex h-8 items-center justify-between bg-card border-b"
        data-tauri-drag-region
      >
        {/* App Logo and Title - Left Side */}
        <div className="flex items-center gap-2 px-3" data-tauri-drag-region>
          <img src={bansheeLogoTransparent} alt="Banshee Logo" className="h-5 w-5 dark:hidden" />
          <img src={bansheeLogoWhite} alt="Banshee Logo" className="h-5 w-5 hidden dark:block" />
          <span className="text-sm font-semibold text-foreground select-none">Banshee AI</span>
        </div>

        {/* Center area is draggable */}
        <div className="flex-1" data-tauri-drag-region />

        {/* Window Controls - Right Side */}
        {windowApi && (
          <div className="flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-12 rounded-none hover:bg-secondary/80 transition-colors"
              onClick={handleMinimize}
              aria-label="Minimize window"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-12 rounded-none hover:bg-secondary/80 transition-colors"
              onClick={handleMaximize}
              aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
            >
              {isMaximized ? <Square className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-12 rounded-none hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={handleClose}
              aria-label="Close window"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Menu Bar */}
      <MenuBar />
    </div>
  );
}
