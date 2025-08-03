/**
 * Enhanced Title Bar with integrated Menu Bar
 *
 * Combines window controls with a comprehensive menu system
 */

import { Button } from '@/components/ui/button';
import { Minus, Square, X, Maximize } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useState, useEffect } from 'react';
import { MenuBar } from './MenuBar';
import bansheeLogoTransparent from '@/assets/banshee-logo-transparent.png';
import bansheeLogoWhite from '@/assets/banshee-logo-white.png';

export function EnhancedTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial window state
    getCurrentWindow().isMaximized().then(setIsMaximized);

    // Listen for window state changes
    const unlistenPromise = getCurrentWindow().onResized(async () => {
      const maximized = await getCurrentWindow().isMaximized();
      setIsMaximized(maximized);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const handleMinimize = async () => {
    await getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    if (isMaximized) {
      await getCurrentWindow().unmaximize();
    } else {
      await getCurrentWindow().maximize();
    }
  };

  const handleClose = async () => {
    await getCurrentWindow().close();
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
      </div>

      {/* Menu Bar */}
      <MenuBar />
    </div>
  );
}
