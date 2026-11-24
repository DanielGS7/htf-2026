/**
 * @file Desktop (md+) left icon rail: logo, nav to every route (commander items hidden for defenders),
 * theme toggle and user menu. Mobile uses TabBar instead.
 * z-40: the sticky rail is its own stacking context, so it must sit above page content for the
 * hover labels to show over it (modals are z-50, toasts z-[70]).
 * @usedBy src/routes/__root.tsx
 */
import { Link } from '@tanstack/react-router'
import { Hexagon, Moon, Sun } from 'lucide-react'
import { useMe } from '#/lib/auth.functions.ts'
import { useTheme } from './AppProviders.tsx'
import { UserMenu } from './UserMenu.tsx'
import { visibleNav } from './nav.ts'

const itemClass =
  'group relative flex size-12 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white'

export function Sidebar() {
  const me = useMe()
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="no-print sticky top-0 z-40 hidden h-screen w-20 shrink-0 flex-col items-center border-r border-line bg-sidebar py-5 md:flex">
      <Link to="/" aria-label="Achrona Mission Control" title="Achrona Mission Control" className="mb-6">
        <div className="relative flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-accent-from to-accent-to text-on-accent shadow-[0_0_28px_-4px_var(--glow)]">
          <Hexagon className="size-7" strokeWidth={2} />
        </div>
      </Link>

      <nav className="flex w-full flex-1 flex-col items-center gap-1.5">
        {visibleNav(me).map(({ label, icon: Icon, to }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className={itemClass}
            activeOptions={{ exact: to === '/' }}
            activeProps={{ className: 'bg-white/10 !text-white shadow-[inset_3px_0_0_var(--accent),0_0_20px_-6px_var(--glow)]' }}
          >
            <Icon className="size-6" strokeWidth={1.5} />
            <span className="pointer-events-none absolute left-full z-50 ml-3 hidden rounded-lg border border-line bg-panel px-2.5 py-1 text-xs whitespace-nowrap text-fg shadow-lg group-hover:block">
              {label}
            </span>
          </Link>
        ))}
      </nav>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className={itemClass}
        >
          {theme === 'dark' ? <Sun className="size-5" strokeWidth={1.5} /> : <Moon className="size-5" strokeWidth={1.5} />}
        </button>
        <UserMenu placement="side" />
      </div>
    </aside>
  )
}
