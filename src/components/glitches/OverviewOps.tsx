/**
 * @file Overview header widgets: the live magic gauge, the compact Achrona map (clicking a glitch
 * marker opens that glitch) and a severity readout (big numbers, HUD panel) with a link to the big-screen mission control.
 * @exports OverviewOps
 * @usedBy src/routes/index.tsx
 */
import { Link } from '@tanstack/react-router'
import { Monitor } from 'lucide-react'
import { AchronaMap } from '#/components/map/AchronaMap.tsx'
import { MagicGauge } from '#/components/mission/MagicGauge.tsx'
import { SEVERITIES, type Glitch } from '#/lib/glitch.ts'

const SEV_TEXT: Record<string, string> = { critical: 'text-danger', high: 'text-warning', medium: 'text-accent-ink', low: 'text-muted' }

export function OverviewOps({ glitches, onSelect }: { glitches: Glitch[]; onSelect: (id: string) => void }) {
  const open = glitches.filter((g) => g.status !== 'FIXED')
  return (
    <div className="grid gap-3 md:grid-cols-[220px_auto_minmax(0,1fr)]">
      <div className="glass flex items-center justify-center rounded-lg p-3">
        <MagicGauge size="sm" />
      </div>
      <AchronaMap glitches={glitches} compact onSelect={onSelect} className="aspect-[10/7] w-full md:h-60 md:w-auto" />
      <div className="glass hud flex flex-col gap-4 rounded-lg p-4 md:min-w-52">
        <div>
          <p className="label">Open glitches</p>
          <div className="font-display text-6xl leading-none font-bold tabular-nums text-fg">{open.length}</div>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {[...SEVERITIES].reverse().map((s) => {
            const n = open.filter((g) => g.severity === s).length
            return (
              <li key={s} className={n ? '' : 'opacity-45'}>
                <p className="label">{s}</p>
                <p className={`font-display text-2xl leading-none font-bold tabular-nums ${n ? SEV_TEXT[s] : 'text-muted'}`}>{n}</p>
              </li>
            )
          })}
        </ul>
        <Link
          to="/mission"
          className="mt-auto inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-accent-ink uppercase hover:underline"
          title="Open the full-screen projector view"
        >
          <Monitor className="size-4" />
          Open mission control
        </Link>
      </div>
    </div>
  )
}
