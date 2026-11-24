/**
 * @file Top-3 podium (2nd, 1st, 3rd) for the leaderboard. Highlights the current user.
 * @exports Podium
 * @usedBy src/routes/leaderboard.tsx
 */
import { Crown } from 'lucide-react'
import { BadgeChip } from '#/components/leaderboard/BadgeChip.tsx'
import type { LeaderboardEntry } from '#/lib/field.functions.ts'

const STYLE = [
  { h: 'h-28', ring: 'border-warning/60', tint: 'from-warning/25', medal: 'text-warning' },
  { h: 'h-20', ring: 'border-zinc-400/60', tint: 'from-zinc-400/20', medal: 'text-zinc-400' },
  { h: 'h-16', ring: 'border-orange-600/60', tint: 'from-orange-600/20', medal: 'text-orange-500' },
] as const

export function Podium({ top, meId }: { top: LeaderboardEntry[]; meId: string | null }) {
  const order = [top[1], top[0], top[2]].map((e, i) => ({ e, idx: [1, 0, 2][i] }))
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="Top three guardians">
      {order.map(({ e, idx }) =>
        e ? (
          <div key={e.guardianId} className="float-in flex min-w-0 flex-col items-center gap-1 text-center" style={{ animationDelay: `${idx * 90}ms` }}>
            {idx === 0 && <Crown className="size-7 text-warning drift" />}
            <p className={`max-w-full truncate text-sm font-semibold ${e.guardianId === meId ? 'text-accent' : ''}`} title={e.codename}>
              {e.codename}
              {e.guardianId === meId && ' (you)'}
            </p>
            <p className="text-xs text-muted tabular-nums">{e.score} pts</p>
            <div className="flex flex-wrap justify-center gap-1">
              {e.badges.slice(0, 2).map((b) => (
                <BadgeChip key={b} id={b} compact />
              ))}
            </div>
            <div className={`${STYLE[idx].h} w-full rounded-t-2xl border-2 border-b-0 bg-linear-to-t to-transparent ${STYLE[idx].ring} ${STYLE[idx].tint} flex items-start justify-center pt-2`}>
              <span className={`font-display text-3xl font-extrabold ${STYLE[idx].medal}`}>{idx + 1}</span>
            </div>
          </div>
        ) : (
          <div key={`empty-${idx}`} />
        ),
      )}
    </div>
  )
}
