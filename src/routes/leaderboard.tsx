/**
 * @file Route /leaderboard: top-3 podium on hanging banners, ranked list with badges and tooltips, live refresh on
 * echo.created / glitch.updated (debounced), current user highlighted.
 * @usedBy router
 */
import { useEffect, useRef } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { BADGE_META, type BadgeId } from '#/components/leaderboard/badgeMeta.ts'
import { BadgeChip } from '#/components/leaderboard/BadgeChip.tsx'
import { PageHeader } from '#/components/ui/PageHeader.tsx'
import { Podium } from '#/components/leaderboard/Podium.tsx'
import { getLeaderboard } from '#/lib/field.functions.ts'
import { useLiveEvents } from '#/lib/useLiveEvents.ts'

export const Route = createFileRoute('/leaderboard')({
  loader: () => getLeaderboard(),
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const { entries, meId } = Route.useLoaderData()
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  useLiveEvents((e) => {
    if (e.type !== 'echo.created' && e.type !== 'glitch.updated') return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void router.invalidate(), 600)
  })

  const rest = entries.slice(3)
  const mine = entries.find((e) => e.guardianId === meId)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        label="Ranking"
        title="Hall of Guardians"
        subtitle={
          <>
            +1 per echo, +3 for opening a glitch, +10 for closing one. Updates live.
            {mine && (
              <>
                {' '}You are <strong className="text-accent-ink">#{mine.rank}</strong> with {mine.score} points.
              </>
            )}
          </>
        }
      />

      {entries.length === 0 ? (
        <p className="glass rounded-lg p-6 text-center text-muted">No guardians yet. Report an echo to claim the first spot.</p>
      ) : (
        <>
          <Podium top={entries.slice(0, 3)} meId={meId} />

          {rest.length > 0 && (
            <ol className="glass hud divide-y divide-line rounded-lg">
              {rest.map((e) => {
                const me = e.guardianId === meId
                return (
                  <li
                    key={e.guardianId}
                    className={`flex min-h-14 items-center gap-3 px-3 py-2 ${me ? 'bg-accent/15 shadow-[inset_3px_0_0_var(--accent)]' : ''}`}
                    aria-current={me ? 'true' : undefined}
                  >
                    <span className="w-8 shrink-0 text-center font-display text-lg font-bold text-muted tabular-nums">{e.rank}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-semibold">
                        {e.codename}
                        {me && <span className="label ml-2 text-accent-ink">you</span>}
                      </p>
                      {e.badges.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {e.badges.map((b) => (
                            <BadgeChip key={b} id={b} />
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-2xl leading-none font-bold tabular-nums">{e.score}</span>
                      <span className="label mt-1 block">{e.echoes} echoes</span>
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
        </>
      )}

      <section className="glass rounded-lg p-4" aria-labelledby="badges-title">
        <h2 id="badges-title" className="label mb-3">
          Badges
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(BADGE_META) as BadgeId[]).map((id) => (
            <li key={id} className="flex items-start gap-2 text-sm">
              <BadgeChip id={id} />
              <span className="text-muted">{BADGE_META[id].hint}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
