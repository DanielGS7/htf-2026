/**
 * @file Full-screen centred shell for the public /login and /join pages: starfield, glow, logo.
 * @exports AuthShell
 * @usedBy src/routes/login.tsx, src/routes/join.tsx
 */
import type { ReactNode } from 'react'
import { Hexagon } from 'lucide-react'

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="starfield relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="drift pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-accent/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="float-in relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex size-16 items-center justify-center rounded-3xl bg-linear-to-br from-accent-from to-accent-to text-on-accent shadow-[0_0_44px_-6px_var(--glow)]">
            <Hexagon className="size-9" strokeWidth={2} />
          </div>
          <p className="font-mono text-xs tracking-[0.3em] text-muted uppercase">Achrona Mission Control</p>
          <h1 className="glow-text mt-2 text-4xl font-bold">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
        </div>
        <div className="glass rounded-3xl p-6 sm:p-8">{children}</div>
      </div>
    </div>
  )
}
