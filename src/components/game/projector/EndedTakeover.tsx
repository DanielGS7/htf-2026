/**
 * @file Projector end screen (phase ended). Defenders win: "ACHRONA HOLDS" with the lightning title art
 * (as its own header image, no text over art) and the lion warrior on the bottom edge. Desync wins:
 * "THE DESYNC WINS" in dark with purple voxel lightning. Unmasks the Desync and lists the top defenders
 * (leaderboard minus the Desync).
 * @exports EndedTakeover
 * @usedBy src/routes/mission.tsx
 */
import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { getLeaderboard, type LeaderboardEntry } from '#/lib/field.functions.ts'
import type { PublicGameState } from '#/lib/game.ts'

export function EndedTakeover({ game }: { game: PublicGameState }) {
  const [top, setTop] = useState<LeaderboardEntry[]>([])
  useEffect(() => {
    let alive = true
    getLeaderboard()
      .then((l) => alive && setTop(l.entries.filter((e) => e.guardianId !== game.desyncId && e.score > 0).slice(0, 3)))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [game.desyncId])

  const won = game.winner === 'defenders'
  return (
    <main
      className={`relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-6 pb-4 text-center ${won ? '' : 'bg-black/60'}`}
    >
      {!won && (
        <>
          <img
            src="/htf/lightning-left.avif"
            alt=""
            aria-hidden
            className="glitch pointer-events-none absolute top-0 left-0 h-full w-auto max-w-none"
            style={{
              maskImage: 'linear-gradient(to right, #000 50%, transparent)',
            }}
          />
          <img
            src="/htf/lightning-right.avif"
            alt=""
            aria-hidden
            className="glitch pointer-events-none absolute top-0 right-0 h-full w-auto max-w-none"
            style={{
              maskImage: 'linear-gradient(to left, #000 50%, transparent)',
            }}
          />
        </>
      )}
      {won && (
        <img
          src="/htf/character-2.avif"
          alt=""
          aria-hidden
          width={400}
          height={560}
          className="pointer-events-none absolute bottom-0 left-[3%] z-0 h-[62%] w-auto max-w-none"
        />
      )}

      <div className="relative z-10 flex min-h-0 flex-col items-center gap-4 [@media(max-height:800px)]:gap-2">
        {won && (
          <img
            src="/htf/curse-of-achrona-lightning.avif"
            alt=""
            aria-hidden
            width={640}
            height={200}
            className="h-40 w-auto max-w-[70vw] object-cover [@media(max-height:800px)]:h-24"
          />
        )}
        <h2
          className={`${won ? 'font-gothic text-fg' : 'glitch font-display font-black tracking-[0.1em] text-magic-soft uppercase'} text-8xl leading-none 2xl:text-9xl [@media(max-height:800px)]:text-7xl`}
        >
          {won ? 'Achrona holds' : 'The Desync wins'}
        </h2>
        {game.endReason && (
          <p className="max-w-4xl font-display text-3xl font-bold tracking-wide text-fg uppercase [@media(max-height:800px)]:text-xl">{game.endReason}</p>
        )}

        <div className={`glass hud rounded-md px-10 py-4 [@media(max-height:800px)]:px-6 [@media(max-height:800px)]:py-2 ${won ? '' : 'border-magic'}`}>
          <div className="label text-base!">The Desync was</div>
          <div className="font-display text-7xl leading-none font-black tracking-wide text-magic-soft uppercase [@media(max-height:800px)]:text-5xl">
            {game.desyncCodename ?? 'unknown'}
          </div>
        </div>

        {top.length > 0 && (
          <div className="glass rounded-md px-8 py-3 [@media(max-height:800px)]:py-2">
            <h3 className="label mb-2 flex items-center justify-center gap-2 text-base!">
              <Trophy className="size-5" /> Top defenders
            </h3>
            <ol className="flex flex-wrap justify-center gap-x-10 gap-y-1">
              {top.map((e, i) => (
                <li key={e.guardianId} className="font-display text-4xl font-bold tracking-wide text-fg uppercase [@media(max-height:800px)]:text-2xl">
                  <span className="text-accent-ink">{i + 1}.</span> {e.codename}{' '}
                  <span className="font-mono text-2xl text-muted [@media(max-height:800px)]:text-lg">{e.score}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </main>
  )
}
