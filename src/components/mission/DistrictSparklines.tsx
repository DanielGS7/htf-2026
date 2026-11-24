/**
 * @file Per-district sensor panel: name, live magic percentage and a sparkline of the last ~2 minutes.
 * @exports DistrictSparklines
 * @usedBy src/routes/mission.tsx, src/routes/admin.tsx
 */
import { DISTRICTS, type DistrictId, type SensorReading } from '#/lib/glitch.ts'
import { magicColor } from './magicColor.ts'
import { Sparkline } from './Sparkline.tsx'

export function DistrictSparklines({
  latest,
  history,
  large = false,
}: {
  latest: SensorReading[]
  history: Record<DistrictId, number[]>
  large?: boolean
}) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {DISTRICTS.map((d) => {
        const m = latest.find((r) => r.districtId === d.id)?.magic ?? 100
        const color = magicColor(m)
        return (
          <li key={d.id} className="flex items-center gap-3">
            <span className={`min-w-0 flex-1 truncate font-medium text-fg ${large ? 'text-base' : 'text-sm'}`} title={d.name}>
              {d.name}
            </span>
            <Sparkline values={history[d.id] ?? []} className={large ? 'h-9 w-24' : 'h-8 w-24'} />
            <span className={`w-14 text-right font-mono font-semibold tabular-nums ${large ? 'text-lg' : 'text-base'}`} style={{ color }}>
              {Math.round(m)}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}
