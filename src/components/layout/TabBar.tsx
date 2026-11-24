/**
 * @file Mobile (<md) bottom tab bar: primary routes plus the user menu (which holds the rest).
 * @exports TabBar
 * @usedBy src/routes/__root.tsx
 */
import { Link } from '@tanstack/react-router'
import { useMe } from '#/lib/auth.functions.ts'
import { UserMenu } from './UserMenu.tsx'
import { visibleNav } from './nav.ts'

export function TabBar() {
  const me = useMe()
  return (
    <nav
      data-theme="dark"
      aria-label="Main"
      className="no-print fixed inset-x-0 bottom-0 z-40 flex items-center justify-around gap-1 border-t border-line bg-sidebar px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {visibleNav(me)
        .filter((i) => i.primary)
        .map(({ label, short, icon: Icon, to }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === '/' }}
            aria-label={label}
            className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-sm border-t-2 border-transparent px-2 py-1 text-xs font-semibold tracking-wide text-muted uppercase"
            activeProps={{ className: '!border-accent bg-accent/10 text-accent-ink' }}
          >
            <Icon className="size-6" strokeWidth={1.6} />
            <span className="max-w-full truncate">{short ?? label}</span>
          </Link>
        ))}
      <UserMenu placement="top" showNav />
    </nav>
  )
}
