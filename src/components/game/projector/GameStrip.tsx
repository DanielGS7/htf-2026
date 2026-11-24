/**
 * @file Projector HUD for a running round (phase playing): big countdown, crew strip (ejected struck
 * through) and the counters hidden threats / discovered / fixed. Never shows roles.
 * @exports GameStrip
 * @usedBy src/routes/mission.tsx
 */
import { Timer } from 'lucide-react'
import type { PublicGameState } from '#/lib/game.ts'
import { formatClock, useNow } from './useGameLive.ts'

function Counter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={`font-display text-4xl leading-none font-extrabold tabular-nums 2xl:text-5xl [@media(max-height:800px)]:text-3xl ${tone}`}>{value}</span>
      <span className="label text-xs! whitespace-nowrap [@media(max-height:800px)]:text-[0.65rem]!">{label}</span>
    </div>
  )
}

export function GameStrip({ game }: { game: PublicGameState }) {
  const now = useNow()
  const left = game.roundEndsAt ? new Date(game.roundEndsAt).getTime() - now : game.roundMs
  const urgent = left < 30_000
  return (
    <section
      aria-label="Desync Protocol round"
      className="glass hud relative z-10 mx-4 flex shrink-0 flex-wrap items-center gap-x-8 gap-y-2 rounded-md px-5 py-2 lg:mx-5 xl:mx-9 [@media(max-height:800px)]:py-1"
    >
      <div className="flex items-center gap-3">
        <Timer className={`size-9 [@media(max-height:800px)]:size-7 ${urgent ? 'text-danger' : 'text-accent-ink'}`} />
        <div>
          <div className="label text-xs!">Round ends in</div>
          <div
            className={`font-display text-6xl leading-none font-black tabular-nums 2xl:text-7xl [@media(max-height:800px)]:text-5xl ${urgent ? 'text-danger' : 'text-fg'}`}
            role="timer"
          >
            {formatClock(left)}
          </div>
        </div>
      </div>

      <ul className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2" aria-label="Crew">
        {game.crew.map((c) => (
          <li
            key={c.guardianId}
            className={`border px-3 py-1 font-display text-xl font-bold tracking-wide uppercase 2xl:text-2xl [@media(max-height:800px)]:text-lg ${c.ejected ? 'border-line text-muted line-through decoration-danger decoration-4' : 'border-accent/50 bg-accent/10 text-fg'}`}
          >
            {c.codename}
            {c.ejected && <span className="sr-only"> (ejected)</span>}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-6">
        <Counter label="Hidden threats" value={game.hiddenSabotages} tone={game.hiddenSabotages ? 'text-magic-soft' : 'text-success'} />
        <Counter label="Discovered" value={game.discoveredSabotages} tone="text-warning" />
        <Counter label="Fixed" value={game.fixedSabotages} tone="text-success" />
      </div>
    </section>
  )
}
