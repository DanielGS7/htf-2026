/**
 * @file Per-district sensor panel: name, a stepped sparkline of the last ~2 minutes, a segmented bar and
 * the live magic percentage in the magic colour. `large` = projector sizing.
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
    <ul className={`grid grid-cols-[minmax(0,1fr)] ${large ? 'h-full grid-rows-[repeat(6,minmax(0,1fr))] gap-1.5' : 'gap-2'}`}>
      {DISTRICTS.map((d) => {
        const m = latest.find((r) => r.districtId === d.id)?.magic ?? 100
        const color = magicColor(m)
        const lit = Math.round(m / 10)
        return (
          <li key={d.id} className="flex min-h-0 items-center gap-3">
            <span className={`min-w-0 flex-1 truncate font-display font-semibold tracking-wide uppercase ${large ? 'text-base 2xl:text-lg' : 'text-sm'}`} title={d.name}>
              <span className="block truncate text-fg">{d.name}</span>
              <span className="mt-1 flex gap-[2px]" aria-hidden>
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} className="h-1.5 flex-1" style={{ background: i < lit ? color : 'var(--line)' }} />
                ))}
              </span>
            </span>
            <Sparkline values={history[d.id] ?? []} className={large ? 'h-9 w-20 2xl:h-10 2xl:w-28' : 'h-8 w-20'} />
            <span className={`text-right font-display font-bold tabular-nums ${large ? 'w-12 text-2xl 2xl:w-[4.25rem] 2xl:text-3xl' : 'w-14 text-xl'}`} style={{ color }}>
              {Math.round(m)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
