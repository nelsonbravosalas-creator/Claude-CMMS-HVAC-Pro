/**
 * ThemeProvider — sistema de temas del CMMS HVAC PRO.
 *
 * 3 temas: 'dark' (default) | 'light' | 'cyberpunk'.
 * Aplica [data-theme] en <html> y persiste la elección en localStorage.
 * Los componentes nunca leen el tema: solo usan tokens semánticos que
 * cambian solos. Este provider únicamente conmuta el atributo raíz.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'dark' | 'light' | 'cyberpunk';

export const THEMES: readonly Theme[] = ['dark', 'light', 'cyberpunk'] as const;

const STORAGE_KEY = 'hvac-theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Cicla dark → light → cyberpunk → dark (útil para un botón único). */
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): Theme {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'cyberpunk') return stored;
  }
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (next: Theme) => setThemeState(next);
  const cycleTheme = () =>
    setThemeState((prev) => THEMES[(THEMES.indexOf(prev) + 1) % THEMES.length]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
