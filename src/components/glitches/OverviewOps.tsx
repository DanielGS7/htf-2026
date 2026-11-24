/**
 * @file Overview header widgets: the live magic gauge and the compact Achrona map (clicking a
 * glitch marker opens that glitch).
 * @exports OverviewOps
 * @usedBy src/routes/index.tsx
 */
import { AchronaMap } from '#/components/map/AchronaMap.tsx'
import { MagicGauge } from '#/components/mission/MagicGauge.tsx'
import type { Glitch } from '#/lib/glitch.ts'

export function OverviewOps({ glitches, onSelect }: { glitches: Glitch[]; onSelect: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-[220px_1fr]">
      <div className="glass flex items-center justify-center rounded-2xl p-3">
        <MagicGauge size="sm" />
      </div>
      <AchronaMap glitches={glitches} compact onSelect={onSelect} className="aspect-[10/7] w-full md:aspect-auto md:h-60" />
    </div>
  )
}
