/**
 * @file Client theme helpers: dark/light preference in localStorage and the <html> data attributes.
 * `THEME_INIT_SCRIPT` is inlined in the root shell to avoid a flash of the wrong theme.
 * @exports Theme, THEME_KEY, THEME_INIT_SCRIPT, readTheme, writeTheme, applyTheme, applyLockdown
 * @usedBy src/components/layout/AppProviders.tsx, src/routes/__root.tsx
 */
export type Theme = 'dark' | 'light'
export const THEME_KEY = 'gg-theme'

/** Runs before hydration. Dark is the default. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}`

export function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function writeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* storage blocked: theme just won't persist */
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export function applyLockdown(active: boolean): void {
  if (active) document.documentElement.dataset.lockdown = 'true'
  else delete document.documentElement.dataset.lockdown
}
