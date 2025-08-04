/**
 * Fallback Title Bar without Tauri dependencies
 *
 * Used when Tauri APIs are not available
 */

import bansheeLogoTransparent from '@/assets/banshee-logo-transparent@2x.png';
import bansheeLogoWhite from '@/assets/banshee-logo-white@2x.png';
import { MenuBar } from './MenuBar';

export function FallbackTitleBar() {
  return (
    <div className="flex flex-col">
      {/* Simple Title Bar */}
      <div className="flex h-8 items-center bg-card border-b px-3">
        <div className="flex items-center gap-2">
          <img src={bansheeLogoTransparent} alt="Banshee Logo" className="h-5 w-5 dark:hidden" />
          <img src={bansheeLogoWhite} alt="Banshee Logo" className="h-5 w-5 hidden dark:block" />
          <span className="text-sm font-semibold text-foreground">Banshee AI</span>
        </div>
      </div>

      {/* Menu Bar */}
      <MenuBar />
    </div>
  );
}
