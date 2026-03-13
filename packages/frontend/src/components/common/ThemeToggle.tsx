'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return (localStorage.getItem('openclaw-studio-theme') as Theme) || 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('openclaw-studio-theme', theme);
}

/** Initialize theme from localStorage — call once at app root */
export function useThemeInit() {
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-xs font-medium text-studio-text-muted hover:text-studio-text hover:bg-studio-bg/50 transition-colors"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span className="w-4 h-4 flex-shrink-0">
        {theme === 'dark' ? (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        ) : (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        )}
      </span>
      <span className="flex-1 text-left">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  );
}
