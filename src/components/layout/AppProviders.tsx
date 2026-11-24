/**
 * @file Client providers for the whole app: theme (dark/light, persisted), lockdown state
 * (from `lockdown` live events or magic < 40), toaster, lockdown banner frame and offline pill.
 * `useTheme()` -> { theme, toggleTheme, lockdown }.
 * @exports AppProviders, useTheme
 * @usedBy src/routes/__root.tsx
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ShieldAlert, WifiOff } from 'lucide-react'
import { ToastProvider } from '#/components/ui/Toast.tsx'
import { useConnectionStatus, useLiveEvents } from '#/lib/useLiveEvents.ts'
import { getLockdownState } from '#/lib/ops.functions.ts'
import { applyLockdown, applyTheme, readTheme, writeTheme, type Theme } from '#/lib/theme.ts'

type ThemeCtx = { theme: Theme; toggleTheme: () => void; lockdown: boolean }
const Ctx = createContext<ThemeCtx>({ theme: 'dark', toggleTheme: () => {}, lockdown: false })
export const useTheme = () => useContext(Ctx)

const LOW_MAGIC = 40

export function AppProviders({ children, signedIn }: { children: ReactNode; signedIn: boolean }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [manual, setManual] = useState<{ active: boolean; reason: string | null }>({ active: false, reason: null })
  const [lowMagic, setLowMagic] = useState(false)

  // Read the stored preference after hydration (the inline script already set the attribute).
  useEffect(() => setTheme(readTheme()), [])
  // Marks the app as interactive (E2E tests wait for html[data-hydrated]).
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true'
  }, [])
  // Seed lockdown from the server so late joiners see an ongoing lockdown (live events only cover changes).
  useEffect(() => {
    getLockdownState()
      .then((s) => setManual(s))
      .catch(() => {})
  }, [])

  const lockdown = manual.active || lowMagic
  useEffect(() => applyLockdown(lockdown), [lockdown])

  useLiveEvents((e) => {
    if (e.type === 'lockdown') setManual({ active: e.active, reason: e.reason })
    else if (e.type === 'magic.level') setLowMagic(e.level < LOW_MAGIC)
  })

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      writeTheme(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme, lockdown }), [theme, toggleTheme, lockdown])
  const reason = manual.reason ?? (lowMagic ? 'Magic level critical' : null)

  return (
    <Ctx.Provider value={value}>
      <ToastProvider>
        {lockdown && <div className="lockdown-frame" aria-hidden />}
        {lockdown && signedIn && (
          <div
            role="alert"
            className="sticky top-0 z-[55] flex items-center justify-center gap-2 bg-linear-to-r from-accent-to via-accent to-accent-to px-4 py-2 text-center text-sm font-semibold tracking-wide text-white uppercase"
          >
            <ShieldAlert className="size-4 shrink-0 animate-pulse" />
            <span>Lockdown active{reason ? `: ${reason}` : ''}</span>
          </div>
        )}
        {children}
        {signedIn && <OfflinePill />}
      </ToastProvider>
    </Ctx.Provider>
  )
}

function OfflinePill() {
  const online = useConnectionStatus()
  // Avoid flashing "offline" before the first connection and during SSR.
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 4000)
    return () => clearTimeout(t)
  }, [])
  if (online || !armed) return null
  return (
    <div
      role="status"
      className="glass fixed top-3 left-1/2 z-[65] flex -translate-x-1/2 items-center gap-2 rounded-full border-warning/40 px-3 py-1.5 text-xs font-medium text-warning"
    >
      <WifiOff className="size-3.5" />
      Offline: reconnecting to the grid...
    </div>
  )
}
