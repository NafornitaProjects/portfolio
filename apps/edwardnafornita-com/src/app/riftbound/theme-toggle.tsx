'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.riftbound-shell');
    setTheme(
      shell?.dataset['theme'] === 'dark' || shell?.dataset['theme'] === 'light'
        ? shell.dataset['theme']
        : systemTheme()
    );
  }, []);

  function toggleTheme() {
    const shell = document.querySelector<HTMLElement>('.riftbound-shell');
    const current =
      shell?.dataset['theme'] === 'dark' || shell?.dataset['theme'] === 'light'
        ? shell.dataset['theme']
        : systemTheme();
    const next = current === 'dark' ? 'light' : 'dark';

    if (shell) shell.dataset['theme'] = next;
    try {
      window.localStorage.setItem('riftbound-theme', next);
    } catch {
      // The visual preference still applies when storage is unavailable.
    }
    setTheme(next);
  }

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      className="rb-theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <svg
        className="rb-theme-icon rb-theme-icon-light"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
      </svg>
      <svg
        className="rb-theme-icon rb-theme-icon-dark"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M20.5 15.2A8.6 8.6 0 0 1 8.8 3.5 8.7 8.7 0 1 0 20.5 15.2Z" />
      </svg>
    </button>
  );
}
