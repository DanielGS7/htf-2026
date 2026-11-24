/**
 * @file Round banner on top of /report while a round is playing: countdown to `roundEndsAt` and the
 * "Defend Achrona" line. Also the lobby "waiting" card.
 * @exports RoundBanner, LobbyCard
 * @usedBy src/routes/report.tsx
 */
import type { PublicGameState } from '#/lib/game.ts'
import { fmtClock, useCountdown } from './useCountdown.ts'

export function RoundBanner({ state }: { state: PublicGameState }) {
  const left = useCountdown(state.roundEndsAt)
  const urgent = left <= 30
  return (
    <section className="glass hud flex items-center justify-between gap-3 rounded-lg px-4 py-3" aria-label="Round timer">
      <span className="min-w-0">
        <span className="label block">Round in progress</span>
        <span className="block font-display text-xl leading-tight font-bold">Defend Achrona</span>
        <span className="mt-0.5 block text-sm text-muted">
          {state.discoveredSabotages > 0
            ? `${state.discoveredSabotages} glitch${state.discoveredSabotages === 1 ? '' : 'es'} found. Fix them.`
            : 'Report anything strange. Fix what is found.'}
        </span>
      </span>
      <span className={`shrink-0 font-display text-5xl leading-none font-bold tabular-nums ${urgent ? 'text-danger' : 'text-fg'}`} aria-live="off">
        {fmtClock(left)}
      </span>
    </section>
  )
}

export function LobbyCard() {
  return (
    <section className="glass hud relative flex min-h-48 flex-col justify-start overflow-hidden rounded-lg px-4 pt-4 pb-0">
      <span className="label">Lobby</span>
      <span className="mt-1 block max-w-[60%] font-display text-2xl leading-tight font-bold">Waiting for the commander to start the round</span>
      <span className="mt-2 block max-w-[60%] pb-16 text-sm text-muted">Your role is revealed on this screen when the round begins.</span>
      <img
        src="/htf/character-4.avif"
        alt=""
        aria-hidden
        width={260}
        height={340}
        className="pointer-events-none absolute right-0 bottom-0 h-44 w-auto object-contain object-bottom"
      />
    </section>
  )
}
