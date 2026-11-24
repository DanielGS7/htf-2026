/**
 * @file Ranked list of the most urgent open glitches (severity, then echo count) for the big screen.
 * @exports TopGlitches
 * @usedBy src/routes/mission.tsx
 */
import { CheckCircle2 } from 'lucide-react'
import { DISTRICTS, type Glitch } from '#/lib/glitch.ts'
import { GlitchTypeIcon, SeverityBadge, StatusBadge } from '#/components/glitches/badges.tsx'

const RANK = { low: 0, medium: 1, high: 2, critical: 3 } as const

export function TopGlitches({ glitches, limit = 5, onSelect }: { glitches: Glitch[]; limit?: number; onSelect?: (id: string) => void }) {
  const top = glitches
    .filter((g) => g.status !== 'FIXED')
    .sort((a, b) => RANK[b.severity] - RANK[a.severity] || (b.echoCount ?? 0) - (a.echoCount ?? 0) || b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)
  if (!top.length) {
    return (
      <div className="flex items-center gap-3 py-4 text-success">
        <CheckCircle2 className="size-6" />
        <span className="text-lg font-medium">All clear. No open glitches.</span>
      </div>
    )
  }
  return (
    <ol className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {top.map((g) => (
        <li key={g.glitchId} className="float-in">
          <button
            type="button"
            onClick={() => onSelect?.(g.glitchId)}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-subtle/60 px-3 py-2 text-left transition hover:bg-subtle-hover"
          >
            <GlitchTypeIcon type={g.type} className="size-6 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-medium text-fg">{g.description}</span>
              <span className="block truncate text-xs text-muted">
                {DISTRICTS.find((d) => d.id === g.districtId)?.name ?? 'Unlocated'} · {g.echoCount ?? 0} echoes
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <SeverityBadge severity={g.severity} />
              <StatusBadge status={g.status} />
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}
