/**
 * @file Ranked list of the most urgent open glitches (severity, then echo count) in projector-size type.
 * Each row carries a severity-coloured left bar (critical pulses). Needs a `relative` parent with a height:
 * the list fills it and drops the rows that don't fit.
 * @exports TopGlitches
 * @usedBy src/routes/mission.tsx
 */
import { CheckCircle2 } from 'lucide-react'
import { DISTRICTS, type Glitch } from '#/lib/glitch.ts'
import { GlitchTypeIcon, SeverityBadge, StatusBadge } from '#/components/glitches/badges.tsx'

const RANK = { low: 0, medium: 1, high: 2, critical: 3 } as const
const BAR = { low: 'bg-muted', medium: 'bg-accent', high: 'bg-warning', critical: 'bg-danger animate-pulse' } as const

export function TopGlitches({ glitches, limit = 5, onSelect }: { glitches: Glitch[]; limit?: number; onSelect?: (id: string) => void }) {
  const top = glitches
    .filter((g) => g.status !== 'FIXED')
    .sort((a, b) => RANK[b.severity] - RANK[a.severity] || (b.echoCount ?? 0) - (a.echoCount ?? 0) || b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)
  if (!top.length) {
    return (
      <div className="flex items-center gap-3 py-4 text-success">
        <CheckCircle2 className="size-8" />
        <span className="font-display text-2xl font-semibold">All clear. No open glitches.</span>
      </div>
    )
  }
  return (
    // Column flex + wrap: rows keep their natural height and any row that doesn't fit wraps into a second
    // column outside the clipped box, so we show as many whole rows as fit instead of squashing them.
    <ol className="absolute inset-0 flex flex-col flex-wrap content-start gap-2 overflow-hidden [@media(max-height:800px)]:gap-1.5">
      {top.map((g) => (
        <li key={g.glitchId} className="float-in w-full shrink-0 grow" style={{ maxHeight: '8rem' }}>
          <button
            type="button"
            onClick={() => onSelect?.(g.glitchId)}
            className="flex size-full overflow-hidden items-stretch gap-3 border border-line bg-subtle/60 text-left transition hover:bg-subtle-hover"
          >
            <span className={`w-1.5 shrink-0 ${BAR[g.severity]}`} aria-hidden />
            <GlitchTypeIcon type={g.type} className="my-2 size-7 shrink-0 self-center [@media(max-height:800px)]:size-6" />
            <span className="min-w-0 flex-1 self-center py-1 pr-3">
              <span className="line-clamp-1 text-xl 2xl:line-clamp-2 leading-tight font-semibold text-fg [@media(max-height:800px)]:text-lg">{g.description}</span>
              <span className="mt-1 flex items-center gap-x-2 overflow-hidden text-base whitespace-nowrap text-muted [@media(max-height:800px)]:text-sm">
                <SeverityBadge severity={g.severity} />
                <StatusBadge status={g.status} />
                <span className="min-w-0 truncate">{DISTRICTS.find((d) => d.id === g.districtId)?.name ?? 'Unlocated'}</span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}
