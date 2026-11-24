/**
 * @file The map of Achrona: a hand-crafted fantasy SVG (1000x700) with a stylised landmass, river,
 * mountains, roads and six organic district regions at the DISTRICTS coordinates. Districts are
 * tinted and glow by their live magic (subscribes to `sensor.reading`; pass `readings` to control it),
 * low-magic districts "glitch", and open glitches are pulsing markers coloured by type and sized by
 * severity. Click a marker to select it. `compact` is the small overview variant.
 * @exports AchronaMap
 * @usedBy src/routes/mission.tsx, src/components/glitches/OverviewOps.tsx
 */
import { useId, useMemo, useState, type ReactNode } from 'react'
import { DISTRICTS, GLITCH_TYPE_META, type DistrictId, type Glitch, type SensorReading } from '#/lib/glitch.ts'
import { magicColor } from '#/components/mission/magicColor.ts'
import { useDistrictMagic } from '#/components/mission/useOpsLive.ts'
import { LANDMASS, MOUNTAINS, RIVER, ROADS, SHORE, districtBlob, hash, markerOffset } from './geometry.ts'

const SEV = {
  low: { r: 8, ring: 3.6, rings: 1, opacity: 0.6 },
  medium: { r: 11, ring: 2.6, rings: 1, opacity: 0.75 },
  high: { r: 14, ring: 1.8, rings: 2, opacity: 0.9 },
  critical: { r: 18, ring: 1.1, rings: 2, opacity: 1 },
} as const

const BLOB_R: Record<DistrictId, number> = { clocktower: 92, archives: 92, citadel: 100, harbor: 80, market: 90, forest: 96 }

const WAVES = Array.from({ length: 70 }, (_, i) => {
  const h = hash(`wave${i}`)
  return { x: 20 + (h % 960), y: 20 + ((h >>> 10) % 660), s: 0.6 + ((h >>> 20) % 10) / 14 }
})

/** Small pictograms drawn around (0,0), roughly 56 units tall. */
const GLYPHS: Record<DistrictId, ReactNode> = {
  clocktower: (
    <g>
      <path d="M-10 10 V-24 L0 -40 L10 -24 V10 Z" />
      <circle cx="0" cy="-17" r="6.5" fill="var(--app)" />
      <path d="M0 -17 V-21 M0 -17 L3 -15" stroke="var(--fg)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="-15" y="8" width="30" height="5" rx="1.5" />
    </g>
  ),
  archives: (
    <g>
      <path d="M-26 12 V-6 L0 -28 L26 -6 V12 Z" />
      {[-15, -5, 5, 15].map((x) => (
        <rect key={x} x={x - 2} y="-4" width="4" height="15" fill="var(--app)" />
      ))}
    </g>
  ),
  citadel: (
    <g>
      <path d="M0 -42 L13 -16 L0 14 L-13 -16 Z" />
      <path d="M-24 -4 L-17 -22 L-10 6 L-17 16 Z" opacity="0.8" />
      <path d="M24 -4 L17 -22 L10 6 L17 16 Z" opacity="0.8" />
      <path d="M0 -42 L0 14 M-13 -16 H13" stroke="var(--app)" strokeWidth="1.2" fill="none" opacity="0.5" />
    </g>
  ),
  harbor: (
    <g>
      <path d="M-26 12 H20 L14 20 H-18 Z" />
      <path d="M-4 8 V-30 L16 4 Z" />
      <path d="M-8 8 V-18 L-22 8 Z" opacity="0.8" />
      <rect x="-3" y="-34" width="2" height="12" />
    </g>
  ),
  market: (
    <g>
      <path d="M-30 12 L-17 -14 L-4 12 Z" />
      <path d="M-4 12 L10 -22 L24 12 Z" opacity="0.85" />
      <path d="M10 -22 V-34 L22 -29 L10 -26" opacity="0.9" />
      <rect x="-35" y="12" width="64" height="3" rx="1.5" />
    </g>
  ),
  forest: (
    <g>
      {[-20, 0, 20].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i === 1 ? -8 : 2})`}>
          <path d="M0 -30 L12 -8 H5 L15 10 H-15 L-5 -8 H-12 Z" />
          <rect x="-2" y="10" width="4" height="7" />
        </g>
      ))}
    </g>
  ),
}

export function AchronaMap({
  glitches,
  readings,
  compact = false,
  onSelect,
  className = 'w-full aspect-[10/7]',
}: {
  glitches: Glitch[]
  /** Controls district magic from outside; when omitted the map fetches + subscribes itself. */
  readings?: SensorReading[]
  compact?: boolean
  onSelect?: (glitchId: string) => void
  className?: string
}) {
  const uid = useId().replace(/:/g, '')
  const magic = useDistrictMagic(readings)
  const [hover, setHover] = useState<string | null>(null)

  const blobs = useMemo(
    () => Object.fromEntries(DISTRICTS.map((d) => [d.id, districtBlob(d.id, d.x, d.y, BLOB_R[d.id])])) as Record<DistrictId, string>,
    [],
  )
  const open = glitches.filter((g) => g.status !== 'FIXED')
  const byDistrict = new Map<string, Glitch[]>()
  for (const g of open) if (g.districtId) byDistrict.set(g.districtId, [...(byDistrict.get(g.districtId) ?? []), g])
  const unlocated = open.filter((g) => !g.districtId).length
  const hovered = open.find((g) => g.glitchId === hover) ?? null

  const pos = (g: Glitch): [number, number] | null => {
    const d = DISTRICTS.find((x) => x.id === g.districtId)
    if (!d) return null
    const group = byDistrict.get(d.id) ?? []
    const [dx, dy] = markerOffset(g.glitchId, group.indexOf(g), group.length)
    return [d.x + dx, d.y + dy]
  }

  const p = (suffix: string) => `${uid}${suffix}`

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line bg-app ${className}`}>
      <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet" className="block size-full" role="img" aria-label="Map of Achrona with district magic levels and open glitches">
        <defs>
          <radialGradient id={p('sea')} cx="50%" cy="48%" r="75%">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--accent) 16%, var(--panel))' }} />
            <stop offset="100%" style={{ stopColor: 'var(--app)' }} />
          </radialGradient>
          <linearGradient id={p('land')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--card-strong) 78%, var(--accent) 14%)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--card) 88%, var(--accent) 6%)' }} />
          </linearGradient>
          <filter id={p('blur')} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id={p('soft')} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
          <pattern id={p('grain')} width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="4" r="0.9" fill="var(--fg)" opacity="0.07" />
            <circle cx="10" cy="11" r="0.7" fill="var(--fg)" opacity="0.06" />
          </pattern>
          <clipPath id={p('clip')}>
            <path d={LANDMASS} />
          </clipPath>
        </defs>

        <style>{`
          .${uid}-ring { transform-box: fill-box; transform-origin: center; animation: ${uid}-ring var(--d, 2s) ease-out infinite; }
          @keyframes ${uid}-ring { 0% { transform: scale(.7); opacity: .85; } 100% { transform: scale(3); opacity: 0; } }
          .${uid}-road { animation: ${uid}-march 1.6s linear infinite; }
          @keyframes ${uid}-march { to { stroke-dashoffset: -28; } }
          .${uid}-river { animation: ${uid}-march 3s linear infinite; }
          .${uid}-jit { animation: ${uid}-jit .28s steps(2, end) infinite; }
          @keyframes ${uid}-jit { 0% { transform: translate(0,0); } 50% { transform: translate(2.4px,-1.6px); } 100% { transform: translate(-2px,1.4px); } }
          .${uid}-twinkle { animation: ${uid}-tw 4s ease-in-out infinite; }
          @keyframes ${uid}-tw { 0%,100% { opacity: .15; } 50% { opacity: .8; } }
          .${uid}-reg { transition: fill .9s ease, stroke .9s ease; }
          @media (prefers-reduced-motion: reduce) { .${uid}-ring,.${uid}-road,.${uid}-river,.${uid}-jit,.${uid}-twinkle { animation: none; } }
        `}</style>

        {/* sea */}
        <rect width="1000" height="700" fill={`url(#${p('sea')})`} />
        <g fill="none" stroke="var(--accent)" strokeLinecap="round" opacity="0.22">
          {WAVES.map((w, i) => (
            <path key={i} d={`M ${w.x} ${w.y} q ${8 * w.s} ${-6 * w.s} ${16 * w.s} 0 t ${16 * w.s} 0 t ${16 * w.s} 0`} strokeWidth="1.4" />
          ))}
        </g>
        {/* sea sparkles */}
        {[
          [60, 90], [40, 300], [30, 520], [70, 640], [300, 40], [700, 30], [960, 60], [975, 420], [960, 660], [600, 690], [380, 690], [20, 190],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.8" fill="var(--fg)" className={`${uid}-twinkle`} style={{ animationDelay: `${(i * 0.7) % 4}s` }} />
        ))}
        {/* small islands */}
        <g fill={`url(#${p('land')})`} stroke="var(--line)" strokeWidth="1.5">
          <path d="M 28 590 q 18 -22 44 -8 q 10 16 -8 26 q -28 8 -36 -18 Z" />
          <path d="M 905 640 q 20 -14 40 2 q 6 14 -14 20 q -24 0 -26 -22 Z" />
          <path d="M 330 18 q 16 -10 34 2 q 4 10 -10 14 q -20 0 -24 -16 Z" />
        </g>

        {/* land */}
        <path d={LANDMASS} fill="var(--app)" opacity="0.5" transform="translate(5 9)" filter={`url(#${p('soft')})`} />
        <path d={SHORE} fill="none" stroke="var(--accent)" strokeOpacity="0.28" strokeWidth="6" filter={`url(#${p('soft')})`} />
        <path d={LANDMASS} fill={`url(#${p('land')})`} stroke="var(--line)" strokeWidth="2.5" />
        <path d={LANDMASS} fill={`url(#${p('grain')})`} />
        <path d={SHORE} fill="none" stroke="var(--fg)" strokeOpacity="0.14" strokeWidth="1.5" strokeDasharray="3 7" />

        <g clipPath={`url(#${p('clip')})`}>
          {/* river */}
          <path d={RIVER} fill="none" stroke="var(--accent)" strokeOpacity="0.18" strokeWidth="20" strokeLinecap="round" />
          <path d={RIVER} fill="none" stroke="color-mix(in srgb, var(--accent) 55%, #22d3ee)" strokeOpacity="0.55" strokeWidth="8" strokeLinecap="round" />
          <path d={RIVER} fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="1.8" strokeDasharray="4 12" strokeLinecap="round" className={`${uid}-river`} />
          {/* mountains */}
          {MOUNTAINS.map((m, i) => (
            <g key={i} transform={`translate(${m.x} ${m.y}) scale(${m.s})`} opacity="0.85">
              <path d="M-22 14 L0 -22 L22 14 Z" fill="var(--card-strong)" stroke="var(--line)" strokeWidth="2" strokeLinejoin="round" />
              <path d="M0 -22 L9 -6 L2 -9 L-3 -3 L-8 -8 Z" fill="var(--fg)" opacity="0.5" />
            </g>
          ))}
        </g>

        {/* roads */}
        {ROADS.map(([a, b, bend]) => {
          const A = DISTRICTS.find((d) => d.id === a)!
          const B = DISTRICTS.find((d) => d.id === b)!
          const mx = (A.x + B.x) / 2
          const my = (A.y + B.y) / 2
          const len = Math.hypot(B.x - A.x, B.y - A.y) || 1
          const cx = mx + (-(B.y - A.y) / len) * bend
          const cy = my + ((B.x - A.x) / len) * bend
          const d = `M ${A.x} ${A.y} Q ${cx.toFixed(0)} ${cy.toFixed(0)} ${B.x} ${B.y}`
          const col = magicColor(Math.min(magic[a], magic[b]), 0.85)
          return (
            <g key={`${a}-${b}`} fill="none" strokeLinecap="round">
              <path d={d} stroke="var(--fg)" strokeOpacity="0.1" strokeWidth="9" />
              <path d={d} stroke={col} strokeWidth="2.4" strokeDasharray="6 8" className={`${uid}-road`} style={{ transition: 'stroke .9s' }} />
            </g>
          )
        })}

        {/* districts */}
        {DISTRICTS.map((d) => {
          const m = magic[d.id]
          const col = magicColor(m)
          const low = m < 40
          return (
            <g key={d.id} className={low ? `${uid}-jit` : undefined}>
              <path d={blobs[d.id]} className={`${uid}-reg`} style={{ fill: magicColor(m, 0.5) }} filter={`url(#${p('blur')})`} />
              <path
                d={blobs[d.id]}
                className={`${uid}-reg`}
                style={{ fill: magicColor(m, low ? 0.3 : 0.22), stroke: col }}
                strokeWidth={low ? 3.5 : 2.5}
                strokeDasharray={low ? '10 6' : undefined}
              />
              <g transform={`translate(${d.x} ${d.y - 12})`} fill="var(--fg)" opacity="0.8">
                {GLYPHS[d.id]}
              </g>
              <text
                x={d.x}
                y={d.y + 38}
                textAnchor="middle"
                className="font-display"
                fontSize={compact ? 27 : 24}
                fontWeight={700}
                fill="var(--fg)"
                style={{ paintOrder: 'stroke', stroke: 'var(--app)', strokeWidth: 6, strokeLinejoin: 'round' }}
              >
                {d.name}
              </text>
              {!compact && (
                <text
                  x={d.x}
                  y={d.y + 68}
                  textAnchor="middle"
                  fontSize="23"
                  fontWeight={800}
                  fill={col}
                  className="font-mono"
                  style={{ paintOrder: 'stroke', stroke: 'var(--app)', strokeWidth: 6, strokeLinejoin: 'round' }}
                >
                  {Math.round(m)}%
                </text>
              )}
            </g>
          )
        })}

        {/* glitch markers */}
        {open.map((g) => {
          const at = pos(g)
          if (!at) return null
          const meta = GLITCH_TYPE_META[g.type]
          const sev = SEV[g.severity]
          const quiet = g.status !== 'LEAKED'
          return (
            <g
              key={g.glitchId}
              transform={`translate(${at[0].toFixed(1)} ${at[1].toFixed(1)})`}
              className={onSelect ? 'cursor-pointer' : undefined}
              onClick={() => onSelect?.(g.glitchId)}
              onMouseEnter={() => setHover(g.glitchId)}
              onMouseLeave={() => setHover((h) => (h === g.glitchId ? null : h))}
              role={onSelect ? 'button' : undefined}
              aria-label={`${meta.label}, ${g.severity}: ${g.description}`}
            >
              {Array.from({ length: sev.rings }, (_, i) => (
                <circle
                  key={i}
                  r={sev.r}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth="2.5"
                  className={`${uid}-ring`}
                  style={{ ['--d' as string]: `${sev.ring * (quiet ? 1.8 : 1)}s`, animationDelay: `${i * (sev.ring / 2)}s` }}
                />
              ))}
              <circle r={sev.r + 7} fill={meta.color} opacity={0.22 * sev.opacity} filter={`url(#${p('soft')})`} />
              <circle r={sev.r} fill={meta.color} fillOpacity={sev.opacity} stroke="white" strokeWidth="2.2" strokeDasharray={quiet ? '3 2.5' : undefined} />
              <circle r={sev.r * 0.35} fill="white" opacity="0.9" />
              {/* generous hit area */}
              <circle r={sev.r + 10} fill="transparent" />
            </g>
          )
        })}

        {/* tooltip */}
        {hovered &&
          (() => {
            const at = pos(hovered)
            if (!at) return null
            const text = hovered.description.length > 44 ? `${hovered.description.slice(0, 43)}...` : hovered.description
            const w = Math.max(190, text.length * 8.4 + 24)
            const x = Math.min(Math.max(at[0] - w / 2, 8), 992 - w)
            const y = at[1] > 110 ? at[1] - 66 : at[1] + 26
            return (
              <g pointerEvents="none">
                <rect x={x} y={y} width={w} height="48" rx="10" fill="var(--panel)" stroke={GLITCH_TYPE_META[hovered.type].color} strokeWidth="1.6" opacity="0.97" />
                <text x={x + 12} y={y + 20} fontSize="13" fontWeight={700} fill={GLITCH_TYPE_META[hovered.type].color} letterSpacing="1">
                  {GLITCH_TYPE_META[hovered.type].label.toUpperCase()} · {hovered.severity.toUpperCase()} · {hovered.status}
                </text>
                <text x={x + 12} y={y + 38} fontSize="14" fill="var(--fg)">
                  {text}
                </text>
              </g>
            )
          })()}

        {/* compass rose + frame */}
        <g transform="translate(66 70)" opacity="0.7">
          <circle r="30" fill="none" stroke="var(--line)" strokeWidth="1.5" />
          <path d="M0 -34 L6 0 L0 34 L-6 0 Z" fill="var(--fg)" opacity="0.5" />
          <path d="M-34 0 L0 -5 L34 0 L0 5 Z" fill="var(--fg)" opacity="0.25" />
          <path d="M0 -34 L6 0 L-6 0 Z" fill="var(--accent)" />
          <text y="-40" textAnchor="middle" fontSize="13" fontWeight={700} fill="var(--fg)">
            N
          </text>
        </g>
        {!compact && (
          <text x="500" y="38" textAnchor="middle" fontSize="20" letterSpacing="14" fill="var(--fg)" opacity="0.28" className="font-display" fontWeight={700}>
            ACHRONA
          </text>
        )}
        <rect x="6" y="6" width="988" height="688" rx="16" fill="none" stroke="var(--line)" strokeWidth="2" />
        <rect x="14" y="14" width="972" height="672" rx="11" fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="2 6" opacity="0.7" />
      </svg>
      {unlocated > 0 && !compact && (
        <span className="absolute right-3 bottom-3 rounded-full border border-line bg-panel/80 px-3 py-1 text-xs text-muted">
          +{unlocated} glitch{unlocated === 1 ? '' : 'es'} with no known district
        </span>
      )}
    </div>
  )
}
