/**
 * @file Desktop (md+) left icon rail: logo, nav to every route (commander items hidden for defenders),
 * theme toggle and user menu. Mobile uses TabBar instead.
 * z-40: the sticky rail is its own stacking context, so it must sit above page content for the
 * hover labels to show over it (modals are z-50, toasts z-[45], hidden on /mission).
 * @usedBy src/routes/__root.tsx
 */
import { Link } from '@tanstack/react-router'
import { Moon, Sun } from 'lucide-react'
import { useMe } from '#/lib/auth.functions.ts'
import { useTheme } from './AppProviders.tsx'
import { UserMenu } from './UserMenu.tsx'
import { visibleNav } from './nav.ts'

const itemClass =
  'group relative flex size-12 items-center justify-center rounded-md text-fg/70 transition hover:bg-subtle hover:text-fg focus-visible:outline-2 focus-visible:outline-accent'

export function Sidebar() {
  const me = useMe()
  const { theme, toggleTheme } = useTheme()

  return (
    // data-theme="dark": the rail stays dark in light mode, so its icons use the dark palette too.
    <aside data-theme="dark" className="no-print sticky top-0 z-40 hidden h-screen w-20 shrink-0 flex-col items-center border-r border-line bg-sidebar py-5 md:flex">
      <span aria-hidden className="rail-line pointer-events-none absolute inset-y-0 right-1" />
      <Link to="/" aria-label="Achrona Mission Control" title="Achrona Mission Control" className="mb-4">
        <img src="/htf/oracle-orb.png" alt="" className="size-12 drop-shadow-[0_4px_0_rgb(0_0_0/0.45)] transition hover:-rotate-6" />
      </Link>

      <div aria-hidden className="ornament mb-4 w-10"><span className="size-1.5 rotate-45 bg-magic" /></div>

      <nav className="flex w-full flex-1 flex-col items-center gap-1.5">
        {visibleNav(me).map(({ label, icon: Icon, to }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className={itemClass}
            activeOptions={{ exact: to === '/' }}
            activeProps={{ className: 'bg-accent/15 !text-accent-ink shadow-[inset_3px_0_0_var(--accent)]' }}
          >
            <Icon className="size-6" strokeWidth={1.5} />
            <span className="pointer-events-none absolute left-full z-50 ml-3 hidden rounded-sm border border-line bg-panel px-2.5 py-1 text-xs font-semibold tracking-wide whitespace-nowrap text-fg uppercase shadow-lg group-hover:block">
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
