/**
 * @file Friendly error + not-found screens for the router. A dropped request (tunnel hiccup, laptop asleep)
 * shows "Signal lost" with a Retry that re-runs the loaders, instead of TanStack's raw error output.
 * Retries by itself when the browser comes back online.
 * @exports RouteError, RouteNotFound
 * @usedBy src/router.tsx (defaultErrorComponent / defaultNotFoundComponent), src/routes/__root.tsx
 */
import { useEffect } from 'react'
import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { RefreshCw, WifiOff } from 'lucide-react'

function Shell({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="glass hud w-full max-w-md rounded-lg p-6 text-center">
        <WifiOff className="mx-auto size-10 text-warning" aria-hidden />
        <h1 className="mt-3 font-display text-2xl font-bold tracking-wide text-fg uppercase">{title}</h1>
        <p className="mt-2 text-muted">{body}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </div>
  )
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const retry = () => {
    reset()
    void router.invalidate()
  }
  useEffect(() => {
    console.error(error)
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])
  return (
    <Shell title="Signal lost" body="Mission Control didn't answer. Check your connection, then try again.">
      <button
        type="button"
        onClick={retry}
        className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 font-semibold tracking-wide text-on-accent uppercase hover:opacity-90"
      >
        <RefreshCw className="size-4" /> Retry
      </button>
      <a href="/" className="inline-flex h-11 items-center rounded-md border border-line px-5 font-semibold tracking-wide text-fg uppercase hover:bg-subtle">
        Overview
      </a>
    </Shell>
  )
}

export function RouteNotFound() {
  return (
    <Shell title="Lost in the mist" body="This part of Achrona doesn't exist (anymore).">
      <Link to="/" className="inline-flex h-11 items-center rounded-md bg-accent px-5 font-semibold tracking-wide text-on-accent uppercase hover:opacity-90">
        Back to the overview
      </Link>
    </Shell>
  )
}
