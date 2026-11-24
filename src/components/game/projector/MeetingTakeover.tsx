/**
 * @file Projector emergency meeting (phase meeting): full-screen takeover "EMERGENCY MEETING called by X",
 * the crew as large cards with live vote bars (meeting.tally), a Skip bar, countdown and votes cast.
 * When meeting.result arrives the voted-out card flips to "X WAS THE DESYNC" (purple) or "X was not the Desync".
 * @exports MeetingTakeover
 * @usedBy src/routes/mission.tsx
 */
import { Siren } from 'lucide-react'
import type { MeetingState, PublicGameState } from '#/lib/game.ts'
import { formatClock, useNow } from './useGameLive.ts'

function Reveal({ meeting }: { meeting: MeetingState }) {
  const r = meeting.result
  if (!r) return null
  const desync = r.wasDesync === true
  return (
    <div
      className={`gg-flip flex h-full flex-col items-center justify-center gap-2 px-3 text-center ${desync ? 'glitch bg-magic text-white' : 'bg-card-strong text-fg'}`}
    >
      <div className="font-display text-5xl leading-none font-black tracking-wide uppercase [@media(max-height:800px)]:text-3xl">{r.ejectedCodename}</div>
      <div className="font-display text-3xl leading-tight font-bold tracking-[0.1em] uppercase [@media(max-height:800px)]:text-xl">
        {desync ? 'was the Desync' : 'was not the Desync'}
      </div>
    </div>
  )
}

export function MeetingTakeover({ game }: { game: PublicGameState }) {
  const now = useNow()
  const m = game.meeting
  if (!m) return null
  const left = new Date(m.endsAt).getTime() - now
  const total = Math.max(m.votesCast, 1)
  const done = m.result !== null
  const cards = [
    ...game.crew.map((c) => ({
      id: c.guardianId,
      name: c.codename,
      ejected: c.ejected,
    })),
    { id: 'skip', name: 'Skip', ejected: false },
  ]
  return (
    <main className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 px-6 py-3 xl:px-12 [@media(max-height:800px)]:gap-2">
      <style>{`@keyframes gg-flip{from{transform:rotateX(90deg);opacity:0}to{transform:none;opacity:1}}.gg-flip{animation:gg-flip .6s ease-out both}@media(prefers-reduced-motion:reduce){.gg-flip{animation:none}}`}</style>
      <div className="flex flex-wrap items-center justify-between gap-4 border-y-4 border-danger bg-danger/15 px-6 py-3 [@media(max-height:800px)]:py-1.5">
        <div className="flex items-center gap-4">
          <Siren className="size-14 shrink-0 animate-pulse text-danger [@media(max-height:800px)]:size-9" />
          <div>
            <h2 className="font-display text-6xl leading-none font-black tracking-[0.12em] text-fg uppercase 2xl:text-7xl [@media(max-height:800px)]:text-4xl">
              Emergency meeting
            </h2>
            <p className="mt-1 font-display text-3xl font-bold tracking-wide text-muted uppercase [@media(max-height:800px)]:text-xl">
              Called by <span className="text-fg">{m.calledByCodename}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="label text-sm!">{done ? 'Vote closed' : 'Voting closes in'}</div>
          <div
            className={`font-display text-7xl leading-none font-black tabular-nums [@media(max-height:800px)]:text-5xl ${left < 8000 && !done ? 'text-danger' : 'text-fg'}`}
            role="timer"
          >
            {done ? '0:00' : formatClock(left)}
          </div>
          <div className="font-display text-2xl font-bold text-accent-ink [@media(max-height:800px)]:text-lg">{m.votesCast} votes cast</div>
        </div>
      </div>

      <ul
        className="grid min-h-0 flex-1 auto-rows-fr gap-4 [@media(max-height:800px)]:gap-2"
        style={{
          gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))`,
        }}
      >
        {cards.map((c) => {
          const votes = m.tally[c.id] ?? 0
          const out = done && m.result?.ejectedId === c.id
          return (
            <li
              key={c.id}
              className={`glass relative flex min-h-0 flex-col overflow-hidden rounded-md ${out ? 'border-2 border-magic' : ''} ${c.ejected && !out ? 'opacity-50' : ''}`}
              /* The reveal card itself is never dimmed: the engine marks the player ejected as the reveal starts. */
            >
              {out ? (
                <Reveal meeting={m} />
              ) : (
                <>
                  <div
                    className={`absolute inset-x-0 bottom-0 transition-[height] duration-700 ${c.id === 'skip' ? 'bg-fg/10' : 'bg-magic/60'}`}
                    style={{ height: `${total > 0 ? Math.round((votes / total) * 100) : 0}%` }}
                    aria-hidden
                  />
                  <div className="relative flex h-full flex-col items-center justify-between gap-3 p-4 text-center [@media(max-height:800px)]:gap-1 [@media(max-height:800px)]:p-2">
                    <div
                      className={`font-display text-5xl leading-tight font-black tracking-wide uppercase [@media(max-height:800px)]:text-3xl ${c.id === 'skip' ? 'text-muted' : 'text-fg'} ${c.ejected ? 'line-through decoration-danger decoration-4' : ''}`}
                    >
                      {c.name}
                    </div>
                    <div>
                      <div className="font-display text-9xl leading-none font-black tabular-nums text-fg 2xl:text-[10rem] [@media(max-height:800px)]:text-7xl">
                        {votes}
                      </div>
                      <div className="label mt-1 text-sm!">{votes === 1 ? 'vote' : 'votes'}</div>
                    </div>
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>
      {done && !m.result?.ejectedId && (
        <p className="text-center font-display text-4xl font-bold tracking-wide text-fg uppercase [@media(max-height:800px)]:text-2xl">
          Nobody was ejected. Back to the defense.
        </p>
      )}
    </main>
  )
}
