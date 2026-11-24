/**
 * @file Top-3 podium (2nd, 1st, 3rd) for the leaderboard on hanging cloth banners (orange = 1st,
 * blue = 2nd/3rd). Rank, codename and score hang below the cloth on solid plates; current user highlighted.
 * @exports Podium
 * @usedBy src/routes/leaderboard.tsx
 */
import { BadgeChip } from '#/components/leaderboard/BadgeChip.tsx'
import type { LeaderboardEntry } from '#/lib/field.functions.ts'

const BANNER = ['/htf/banner-orange.avif', '/htf/banner-blue.avif', '/htf/banner-blue.avif'] as const
// Banner height by rank: the winner hangs lowest.
const HEIGHT = ['h-44 sm:h-60', 'h-36 sm:h-48', 'h-32 sm:h-44'] as const

export function Podium({ top, meId }: { top: LeaderboardEntry[]; meId: string | null }) {
  const order = [top[1], top[0], top[2]].map((e, i) => ({ e, idx: [1, 0, 2][i] }))
  return (
    <ol className="grid grid-cols-3 items-start gap-2 sm:gap-6" aria-label="Top three guardians">
      {order.map(({ e, idx }) =>
        e ? (
          <li
            key={e.guardianId}
            aria-current={e.guardianId === meId ? 'true' : undefined}
            className="float-in flex min-w-0 flex-col items-center gap-2 text-center"
            style={{ animationDelay: `${idx * 90}ms` }}
          >
            <div className={`relative w-full ${HEIGHT[idx]}`}>
              <img src={BANNER[idx]} alt="" aria-hidden className="absolute inset-0 size-full object-contain object-top" />
              <span className="absolute inset-x-0 top-[34%] text-center font-display text-4xl leading-none font-bold text-white tabular-nums sm:text-6xl [text-shadow:0_2px_0_rgb(10_6_16/0.55)]">
                {idx + 1}
              </span>
            </div>
            <div className={`glass w-full min-w-0 rounded-md px-2 py-2 ${e.guardianId === meId ? 'border-accent' : ''}`}>
              <p className={`truncate font-display text-sm font-bold sm:text-base ${e.guardianId === meId ? 'text-accent-ink' : ''}`} title={e.codename}>
                {e.codename}
              </p>
              <p className="font-display text-xl leading-tight font-bold tabular-nums sm:text-2xl">
                {e.score}
                <span className="label ml-1">pts</span>
              </p>
              {e.guardianId === meId && <p className="label text-accent-ink">you</p>}
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                {e.badges.slice(0, 2).map((b) => (
                  <BadgeChip key={b} id={b} compact />
                ))}
              </div>
            </div>
          </li>
        ) : (
          <li key={`empty-${idx}`} aria-hidden />
        ),
      )}
    </ol>
  )
}
