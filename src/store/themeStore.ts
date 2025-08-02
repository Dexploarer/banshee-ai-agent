import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  systemTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  setSystemTheme: (theme: 'light' | 'dark') => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      systemTheme: 'light',

      setTheme: (theme) => {
        set({ theme });

        // Apply theme to document
        const effectiveTheme = theme === 'system' ? get().systemTheme : theme;
        if (effectiveTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      setSystemTheme: (systemTheme) => {
        set({ systemTheme });

        // If using system theme, update document
        if (get().theme === 'system') {
          if (systemTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },

      getEffectiveTheme: () => {
        const { theme, systemTheme } = get();
        return theme === 'system' ? systemTheme : theme;
      },
    }),
    {
      name: 'banshee-theme',
    }
  )
);

// Initialize theme on app start
if (typeof window !== 'undefined') {
  const store = useThemeStore.getState();

  // Detect system theme
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  store.setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

  // Listen for system theme changes
  mediaQuery.addEventListener('change', (e) => {
    store.setSystemTheme(e.matches ? 'dark' : 'light');
  });

  // Apply initial theme
  const effectiveTheme = store.getEffectiveTheme();
  if (effectiveTheme === 'dark') {
    document.documentElement.classList.add('dark');
  }
}
