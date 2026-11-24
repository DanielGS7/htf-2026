/**
 * @file Squared badge tag with tooltip (native title + focusable) explaining how it is earned.
 * @exports BadgeChip
 * @usedBy src/routes/leaderboard.tsx, src/components/leaderboard/Podium.tsx
 */
import { Crown, CloudLightning, Eye, Siren, Wrench, type LucideIcon } from 'lucide-react'
import { BADGE_META, type BadgeId } from '#/components/leaderboard/badgeMeta.ts'

const ICONS: Record<string, LucideIcon> = { Siren, CloudLightning, Wrench, Eye, Crown }

export function BadgeChip({ id, compact = false }: { id: BadgeId; compact?: boolean }) {
  const m = BADGE_META[id]
  const Icon = ICONS[m.icon] ?? Siren
  return (
    <span
      title={`${m.label}: ${m.hint}`}
      tabIndex={0}
      aria-label={`${m.label}: ${m.hint}`}
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border border-line bg-subtle px-1.5 py-0.5 font-mono text-[12px] leading-4 font-semibold tracking-wider uppercase focus-visible:outline-2 focus-visible:outline-accent"
      style={{ color: m.color }}
    >
      <Icon className="size-3.5" />
      {!compact && <span className="text-fg">{m.label}</span>}
    </span>
  )
}
