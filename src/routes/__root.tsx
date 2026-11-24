/**
 * @file Root route: HTML shell (theme init script, no-flash) + app layout.
 * beforeLoad fetches the current guardian (`getMe`) and exposes it as route context `{ me }`
 * (read with `useMe()` from #/lib/auth.functions.ts or `useRouteContext({ from: '__root__' })`).
 * Redirects logged-out users to /login?next=..., and logged-in users away from /login.
 * Public paths: /login, /join, /api/*. Public pages render without the sidebar/tab bar.
 */
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Sidebar } from '#/components/layout/Sidebar'
import { TabBar } from '#/components/layout/TabBar'
import { AppProviders } from '#/components/layout/AppProviders'
import { getMe } from '#/lib/auth.functions'
import { THEME_INIT_SCRIPT } from '#/lib/theme'

import appCss from '../styles.css?url'

const isPublic = (p: string) => p === '/login' || p === '/join' || p.startsWith('/api/')

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const me = await getMe()
    if (!me && !isPublic(location.pathname)) {
      throw redirect({ to: '/login', search: { next: location.href } })
    }
    if (me && location.pathname === '/login') throw redirect({ to: '/' })
    if (me && location.pathname === '/join') throw redirect({ to: '/report' })
    return { me }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'Achrona Mission Control' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  component: AppLayout,
})

function AppLayout() {
  const { me } = Route.useRouteContext()
  const { pathname } = useLocation()
  const chrome = !!me && !isPublic(pathname)

  return (
    <AppProviders signedIn={!!me}>
      {chrome ? (
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 pt-6 pb-28 md:px-10 md:py-10">
            <Outlet />
          </main>
          <TabBar />
        </div>
      ) : (
        <Outlet />
      )}
    </AppProviders>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="bg-app font-sans antialiased">
        {children}
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
