/**
 * @file Overview header widgets: the live magic gauge, the compact Achrona map (clicking a glitch
 * marker opens that glitch) and a small severity summary with a link to the big-screen mission control.
 * @exports OverviewOps
 * @usedBy src/routes/index.tsx
 */
import { Link } from '@tanstack/react-router'
import { Monitor } from 'lucide-react'
import { AchronaMap } from '#/components/map/AchronaMap.tsx'
import { MagicGauge } from '#/components/mission/MagicGauge.tsx'
import { SEVERITIES, type Glitch } from '#/lib/glitch.ts'
import { SEVERITY_STYLE } from './badges.tsx'

export function OverviewOps({ glitches, onSelect }: { glitches: Glitch[]; onSelect: (id: string) => void }) {
  const open = glitches.filter((g) => g.status !== 'FIXED')
  return (
    <div className="grid gap-3 md:grid-cols-[220px_auto_minmax(0,1fr)]">
      <div className="glass flex items-center justify-center rounded-2xl p-3">
        <MagicGauge size="sm" />
      </div>
      <AchronaMap glitches={glitches} compact onSelect={onSelect} className="aspect-[10/7] w-full md:h-60 md:w-auto" />
      <div className="glass flex flex-col gap-3 rounded-2xl p-4 md:min-w-44">
        <div>
          <div className="font-display text-3xl font-extrabold text-fg">{open.length}</div>
          <div className="text-xs tracking-wider text-muted uppercase">open glitches</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[...SEVERITIES].reverse().map((s) => {
            const n = open.filter((g) => g.severity === s).length
            return (
              <span key={s} className={`rounded-full border px-2 py-0.5 text-[11px] uppercase ${SEVERITY_STYLE[s]} ${n ? '' : 'opacity-40'}`}>
                {n} {s}
              </span>
            )
          })}
        </div>
        <Link
          to="/mission"
          className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
          title="Open the full-screen projector view"
        >
          <Monitor className="size-4" />
          Open mission control
        </Link>
      </div>
    </div>
  )
}
