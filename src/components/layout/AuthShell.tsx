/**
 * @file Full-screen shell for the public /login and /join pages, in the HTF 2026 look: plum vignette,
 * purple voxel lightning on both edges, the official "Curse of Achrona" title art and a character
 * peeking past the form (desktop only).
 * @exports AuthShell
 * @usedBy src/routes/login.tsx, src/routes/join.tsx
 */
import type { ReactNode } from 'react'

/** character-1 = orc knight (commanders), character-4 = robot archer (defenders). */
export function AuthShell({
  title,
  subtitle,
  character = 1,
  children,
}: {
  title: string
  subtitle: string
  character?: 1 | 4
  children: ReactNode
}) {
  return (
    <div className="starfield relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <img aria-hidden src="/htf/lightning-left.avif" alt="" className="pointer-events-none absolute top-0 -left-16 hidden h-full w-auto opacity-90 sm:block lg:left-0" />
      <img aria-hidden src="/htf/lightning-right.avif" alt="" className="pointer-events-none absolute top-0 -right-16 hidden h-full w-auto opacity-90 sm:block lg:right-0" />

      <div className="float-in relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/htf/htf-logo.svg" alt="Hack The Future" className="mb-5 h-7 w-auto opacity-90" />
          <img src="/htf/curse-of-achrona.avif" alt="The Curse of Achrona" className="w-72 max-w-full drop-shadow-[0_10px_0_rgb(10_6_16/0.6)]" />
          <p className="label mt-4">Mission Control</p>
        </div>

        <div className="relative">
          <img
            aria-hidden
            src={`/htf/character-${character}.avif`}
            alt=""
            className={`pointer-events-none absolute bottom-0 hidden w-60 lg:block ${character === 1 ? '-left-56' : '-right-60'}`}
          />
          <div className="glass hud relative p-6 sm:p-8">
            <h1 className="font-display text-2xl font-bold tracking-wide uppercase">{title}</h1>
            <p className="mt-1 mb-6 text-muted">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
