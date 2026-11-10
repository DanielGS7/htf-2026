import {Link} from '@tanstack/react-router'
import {Activity, LayoutGrid, LogOut, type LucideIcon,} from 'lucide-react'

type NavItem = {
  label: string
  icon: LucideIcon
  /** Only set for pages that already have a route. */
  to?: '/'
}

const navItems: NavItem[] = [
  { label: 'Overview', icon: LayoutGrid, to: '/' },
]

const itemClass =
  'flex w-full items-center gap-3 whitespace-nowrap px-7 py-4 text-left text-lg text-muted transition-colors hover:bg-subtle hover:text-fg'
const activeClass =
  'bg-gradient-to-r from-[color-mix(in_oklab,var(--accent-from)_45%,var(--accent-to))] to-accent-to text-white shadow-md shadow-violet-700/15 inset-shadow-[0_1px_0_rgb(255_255_255/0.22)] hover:text-white'

export function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[300px] shrink-0 flex-col border-r border-line bg-sidebar">
      <div className="flex items-center gap-4 border-b border-line px-7 py-7">
        <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-[color-mix(in_oklab,var(--accent-from)_45%,var(--accent-to))] to-accent-to text-white shadow-md shadow-violet-700/20 inset-shadow-[0_1px_0_rgb(255_255_255/0.22)]">
          <Activity className="size-7" strokeWidth={2} />
        </div>
        <div>
          <p className="text-xl font-semibold text-fg">Achrona</p>
          <p className="text-muted">Control Center</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 py-8">
        {navItems.map(({ label, icon: Icon, to }) => {
          const content = (
            <>
              <Icon className="size-6" strokeWidth={1.5} />
              {label}
            </>
          )
          return to ? (
            <Link
              key={label}
              to={to}
              className={itemClass}
              activeOptions={{ exact: true }}
              activeProps={{ className: activeClass }}
            >
              {content}
            </Link>
          ) : (
            <button key={label} type="button" className={itemClass}>
              {content}
            </button>
          )
        })}
      </nav>

      <div className="py-8">
        <button type="button" className={itemClass}>
          <LogOut className="size-6" strokeWidth={1.5} />
          Log Out
        </button>
      </div>
    </aside>
  )
}
