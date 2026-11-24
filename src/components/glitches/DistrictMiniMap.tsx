/**
 * @file Tiny SVG showing where in Achrona a glitch sits (highlighted district). Lightweight stand-in
 * for the full AchronaMap so the detail page needs no cross-WP dependency.
 * @exports DistrictMiniMap
 * @usedBy src/routes/glitches.$glitchId.tsx
 */
import { DISTRICTS, type DistrictId } from '#/lib/glitch.ts'

export function DistrictMiniMap({ districtId, color }: { districtId: DistrictId | null; color: string }) {
  return (
    <svg viewBox="0 0 1000 700" className="w-full rounded-xl border border-line bg-subtle" role="img" aria-label="District location">
      {DISTRICTS.map((d) => {
        const hot = d.id === districtId
        return (
          <g key={d.id}>
            <circle cx={d.x} cy={d.y} r={hot ? 46 : 28} fill={hot ? color : 'currentColor'} opacity={hot ? 0.9 : 0.18} className={hot ? 'animate-pulse' : 'text-muted'} />
            <text x={d.x} y={d.y + (hot ? 78 : 56)} textAnchor="middle" fontSize={hot ? 38 : 30} fill="currentColor" className={hot ? 'text-fg' : 'text-muted'} fontWeight={hot ? 700 : 400}>
              {d.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
