/**
 * @file User menu popover: codename, role, theme toggle, logout (+ non-primary nav links on mobile).
 * @exports UserMenu
 * @usedBy src/components/layout/Sidebar.tsx, src/components/layout/TabBar.tsx
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { Crown, LogOut, Moon, Shield, Sun } from 'lucide-react'
import { useMe, logoutFn } from '#/lib/auth.functions.ts'
import { Badge } from '#/components/ui/Badge.tsx'
import { useTheme } from './AppProviders.tsx'
import { visibleNav } from './nav.ts'

export function UserMenu({ placement, showNav = false }: { placement: 'side' | 'top'; showNav?: boolean }) {
  const me = useMe()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!me) return null
  const Role = me.role === 'commander' ? Crown : Shield
  const logout = async () => {
    await logoutFn()
    await router.navigate({ to: '/login' })
    router.invalidate()
  }
  const extra = showNav ? visibleNav(me).filter((i) => !i.primary) : []

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="User menu"
        title={`${me.codename} (${me.role})`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex size-10 items-center justify-center rounded-full border border-line bg-linear-to-br from-accent-from to-accent-to font-display text-sm font-bold text-on-accent shadow-[0_0_18px_-4px_var(--glow)] transition hover:brightness-110"
      >
        {me.codename.slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div
          className={`glass float-in absolute z-50 w-60 rounded-2xl p-2 ${
            placement === 'side' ? 'bottom-0 left-full ml-3' : 'right-0 bottom-full mb-3'
          }`}
        >
          <div className="px-2 py-2">
            <p className="truncate font-display font-semibold">{me.codename}</p>
            <Badge tone={me.role === 'commander' ? 'accent' : 'neutral'} className="mt-1">
              <Role className="size-3" />
              {me.role}
            </Badge>
          </div>
          <div className="my-1 h-px bg-line" />
          {extra.map(({ label, icon: Icon, to }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-subtle">
              <Icon className="size-4 text-muted" />
              {label}
            </Link>
          ))}
          <button type="button" onClick={toggleTheme} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-subtle">
            {theme === 'dark' ? <Sun className="size-4 text-muted" /> : <Moon className="size-4 text-muted" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-danger hover:bg-subtle">
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
