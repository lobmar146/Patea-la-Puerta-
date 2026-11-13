import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');

  function toggle() {
    const theme = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    setDark(!dark);
    try {
      localStorage.setItem('pp-theme', theme);
    } catch {
      // El tema sigue activo durante esta visita aunque no pueda guardarse.
    }
  }

  return (
    <button type="button" className="theme-toggle" aria-pressed={dark} title="Modo oscuro" onClick={toggle}>
      {dark ? <Sun aria-hidden className="size-5 shrink-0" /> : <Moon aria-hidden className="size-5 shrink-0" />}
      <span className={compact ? 'sr-only' : undefined}>Modo oscuro</span>
    </button>
  );
}
