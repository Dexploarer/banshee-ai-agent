import { Button } from '@/components/ui/button';
import { Minus, Square, X } from 'lucide-react';
import bansheeLogoTransparent from '@/assets/banshee-logo-transparent.png';
import bansheeLogoWhite from '@/assets/banshee-logo-white.png';

export function TitleBar() {
  const handleMinimize = () => {
    // TODO: Implement window minimize
    console.log('Minimize window');
  };

  const handleMaximize = () => {
    // TODO: Implement window maximize
    console.log('Maximize window');
  };

  const handleClose = () => {
    // TODO: Implement window close
    console.log('Close window');
  };

  return (
    <div className="flex h-8 items-center justify-between bg-card border-b tauri-drag-region">
      {/* App Title */}
      <div className="flex items-center gap-2 px-4">
        <img src={bansheeLogoTransparent} alt="Banshee Logo" className="h-4 w-4 dark:hidden" />
        <img src={bansheeLogoWhite} alt="Banshee Logo" className="h-4 w-4 hidden dark:block" />
        <span className="text-sm font-medium text-foreground">Banshee</span>
      </div>

      {/* Window Controls */}
      <div className="flex tauri-no-drag">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-none hover:bg-secondary"
          onClick={handleMinimize}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-none hover:bg-secondary"
          onClick={handleMaximize}
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-none hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
