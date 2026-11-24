/**
 * @file The map of Achrona in the HTF look: a plum-black fantasy SVG (1000x700) with a stylised landmass,
 * river, mountains, subtle roads and six districts at the DISTRICTS coordinates. Districts are tinted
 * regions with a crisp outline whose colour follows live magic (blue/teal healthy -> purple -> orange ->
 * red drained; subscribes to `sensor.reading`, or pass `readings`). Districts under 60% look cursed
 * (purple lightning cracks + floating voxel cubes, below 40% they also jitter). Open glitches are
 * voxel-cube markers in their type colour (`GLITCH_TYPE_META`), pulsing by severity, with cubes breaking
 * off the high/critical ones. Click a marker to select it. `compact` is the small overview variant.
 * @exports AchronaMap
 * @usedBy src/routes/mission.tsx, src/components/glitches/OverviewOps.tsx
 */
import { useId, useMemo, useState, type ReactNode } from 'react'
import { DISTRICTS, GLITCH_TYPE_META, type DistrictId, type Glitch, type SensorReading } from '#/lib/glitch.ts'
import { magicColor } from '#/components/mission/magicColor.ts'
import { useDistrictMagic } from '#/components/mission/useOpsLive.ts'
import { LANDMASS, MOUNTAINS, RIVER, ROADS, districtBlob, hash, markerOffset } from './geometry.ts'

const SEV = {
  low: { r: 8, ring: 3.6, rings: 1, opacity: 0.6 },
  medium: { r: 11, ring: 2.6, rings: 1, opacity: 0.75 },
  high: { r: 14, ring: 1.8, rings: 2, opacity: 0.9 },
  critical: { r: 18, ring: 1.1, rings: 2, opacity: 1 },
} as const

const BLOB_R: Record<DistrictId, number> = { clocktower: 92, archives: 92, citadel: 100, harbor: 80, market: 90, forest: 96 }

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

/** Jagged purple lightning crack through a district (deterministic per district + variant). */
function crackPath(id: string, cx: number, cy: number, r: number, variant: number): string {
  const steps = 8
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const h = hash(`${id}crack${variant}-${i}`)
    const t = i / steps
    const x = cx + (variant ? 0.45 : -0.3) * r * (t - 0.5) * 2 + (((h % 100) / 100) - 0.5) * r * 0.5
    const y = cy - r * 0.8 + t * r * 1.6
    d += `${i ? ' L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

/** Floating voxel cubes inside a district, for the cursed shimmer. */
function voxels(id: string, cx: number, cy: number, r: number, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const h = hash(`${id}vox${i}`)
    const a = ((h % 360) / 180) * Math.PI
    const rr = r * (0.35 + ((h >>> 9) % 60) / 100)
    return { x: cx + Math.cos(a) * rr * 1.1, y: cy + Math.sin(a) * rr * 0.8, s: 5 + ((h >>> 18) % 6), delay: ((h >>> 4) % 30) / 10 }
  })
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
  const fx = useMemo(
    () =>
      Object.fromEntries(
        DISTRICTS.map((d) => [
          d.id,
          { cracks: [crackPath(d.id, d.x, d.y, BLOB_R[d.id], 0), crackPath(d.id, d.x, d.y, BLOB_R[d.id], 1)], cubes: voxels(d.id, d.x, d.y, BLOB_R[d.id], 9) },
        ]),
      ) as Record<DistrictId, { cracks: string[]; cubes: ReturnType<typeof voxels> }>,
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
    <div className={`relative overflow-hidden rounded-md border border-line bg-sidebar ${className}`}>
      <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet" className="block size-full" role="img" aria-label="Map of Achrona with district magic levels and open glitches">
        <defs>
          <pattern id={p('grid')} width="28" height="28" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="2" height="2" fill="var(--line)" opacity="0.5" />
          </pattern>
          <pattern id={p('hatch')} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="3" height="9" fill="var(--magic)" opacity="0.28" />
          </pattern>
          <clipPath id={p('clip')}>
            <path d={LANDMASS} />
          </clipPath>
        </defs>

        <style>{`
          .${uid}-ring { transform-box: fill-box; transform-origin: center; animation: ${uid}-ring var(--d, 2s) steps(6, end) infinite; }
          @keyframes ${uid}-ring { 0% { transform: scale(.8); opacity: .9; } 100% { transform: scale(2.8); opacity: 0; } }
          .${uid}-jit { animation: ${uid}-jit .3s steps(2, end) infinite; }
          @keyframes ${uid}-jit { 0% { transform: translate(0,0); } 50% { transform: translate(2.6px,-1.6px); } 100% { transform: translate(-2.2px,1.4px); } }
          .${uid}-zap { animation: ${uid}-zap 1.3s steps(1, end) infinite; }
          @keyframes ${uid}-zap { 0% { opacity: 1; } 12% { opacity: .15; } 24% { opacity: 1; } 55% { opacity: .85; } 62% { opacity: .1; } 70% { opacity: 1; } 100% { opacity: 1; } }
          .${uid}-vox { animation: ${uid}-vox 2.4s steps(4, end) infinite; }
          @keyframes ${uid}-vox { 0% { transform: translate(0,0); opacity: .9; } 50% { transform: translate(5px,-9px); opacity: .35; } 100% { transform: translate(10px,-18px); opacity: 0; } }
          .${uid}-reg { transition: fill .9s ease, stroke .9s ease; }
          @media (prefers-reduced-motion: reduce) { .${uid}-ring,.${uid}-jit,.${uid}-zap,.${uid}-vox { animation: none; } }
        `}</style>

        {/* sea */}
        <rect width="1000" height="700" fill="var(--sidebar)" />
        <rect width="1000" height="700" fill={`url(#${p('grid')})`} />

        {/* land: hard plum slab with a stepped drop edge */}
        <path d={LANDMASS} fill="rgb(10 6 16 / 0.85)" transform="translate(7 10)" />
        <path d={LANDMASS} fill="var(--card)" stroke="var(--line)" strokeWidth="4" strokeLinejoin="round" />
        <path d={LANDMASS} fill="none" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="10 8" transform="translate(0 0)" />

        <g clipPath={`url(#${p('clip')})`}>
          <path d={RIVER} fill="none" stroke="var(--accent)" strokeOpacity="0.28" strokeWidth="14" strokeLinecap="square" strokeLinejoin="miter" />
          <path d={RIVER} fill="none" stroke="var(--fg)" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="6 14" />
          {MOUNTAINS.map((m, i) => (
            <g key={i} transform={`translate(${m.x} ${m.y}) scale(${m.s})`} opacity="0.7">
              <path d="M-22 14 L0 -22 L22 14 Z" fill="var(--card-strong)" stroke="var(--line)" strokeWidth="2" strokeLinejoin="miter" />
              <path d="M0 -22 L9 -6 L2 -9 L-3 -3 L-8 -8 Z" fill="var(--fg)" opacity="0.35" />
            </g>
          ))}
        </g>

        {/* roads: subtle */}
        {ROADS.map(([a, b, bend]) => {
          const A = DISTRICTS.find((d) => d.id === a)!
          const B = DISTRICTS.find((d) => d.id === b)!
          const mx = (A.x + B.x) / 2
          const my = (A.y + B.y) / 2
          const len = Math.hypot(B.x - A.x, B.y - A.y) || 1
          const cx = mx + (-(B.y - A.y) / len) * bend
          const cy = my + ((B.x - A.x) / len) * bend
          return <path key={`${a}-${b}`} d={`M ${A.x} ${A.y} Q ${cx.toFixed(0)} ${cy.toFixed(0)} ${B.x} ${B.y}`} fill="none" stroke="var(--fg)" strokeOpacity="0.16" strokeWidth="3" strokeDasharray="2 9" />
        })}

        {/* districts */}
        {DISTRICTS.map((d) => {
          const m = magic[d.id]
          const col = magicColor(m)
          const cursed = m < 60
          const low = m < 40
          const labelW = d.name.length * (compact ? 17 : 15.5) + 26
          const labelH = compact ? 40 : 36
          const ly = d.y + 16
          return (
            <g key={d.id} className={low ? `${uid}-jit` : undefined}>
              <path d={blobs[d.id]} className={`${uid}-reg`} style={{ fill: magicColor(m, 0.3), stroke: col }} strokeWidth="4" strokeLinejoin="round" />
              {cursed && (
                <g clipPath={undefined}>
                  <path d={blobs[d.id]} fill={`url(#${p('hatch')})`} className={`${uid}-zap`} />
                  <path d={blobs[d.id]} fill="none" stroke="var(--magic-soft)" strokeWidth="2" strokeDasharray="12 7" className={`${uid}-zap`} />
                  {fx[d.id].cracks.slice(0, low ? 2 : 1).map((c, i) => (
                    <g key={i} className={`${uid}-zap`} style={{ animationDelay: `${i * 0.5}s` }} fill="none" strokeLinejoin="miter">
                      <path d={c} stroke="var(--magic)" strokeWidth="9" strokeOpacity="0.55" />
                      <path d={c} stroke="var(--magic-soft)" strokeWidth="3.5" />
                    </g>
                  ))}
                  {fx[d.id].cubes.slice(0, low ? 9 : 5).map((c, i) => (
                    <rect key={i} x={c.x} y={c.y} width={c.s} height={c.s} fill={i % 2 ? 'var(--magic-soft)' : 'var(--magic)'} className={`${uid}-vox`} style={{ animationDelay: `${c.delay}s` }} />
                  ))}
                </g>
              )}
              <g transform={`translate(${d.x} ${d.y - 18})`} fill="var(--fg)" opacity="0.75">
                {GLYPHS[d.id]}
              </g>
              <rect x={d.x - labelW / 2} y={ly} width={labelW} height={labelH} fill="rgb(16 10 23 / 0.9)" stroke={col} strokeWidth="2" />
              <text x={d.x} y={ly + labelH * 0.73} textAnchor="middle" className="font-display" fontSize={compact ? 29 : 25} fontWeight={700} letterSpacing="1.5" fill="var(--fg)">
                {d.name.toUpperCase()}
              </text>
              {!compact && (
                <text
                  x={d.x}
                  y={ly + labelH + 31}
                  textAnchor="middle"
                  fontSize="32"
                  fontWeight={800}
                  fill={col}
                  className="font-display"
                  style={{ paintOrder: 'stroke', stroke: 'rgb(16 10 23)', strokeWidth: 7, strokeLinejoin: 'miter' }}
                >
                  {Math.round(m)}%
                </text>
              )}
            </g>
          )
        })}

        {/* glitch markers: voxel cubes in the type colour */}
        {open.map((g) => {
          const at = pos(g)
          if (!at) return null
          const meta = GLITCH_TYPE_META[g.type]
          const sev = SEV[g.severity]
          const quiet = g.status !== 'LEAKED'
          const s = sev.r * 1.5
          const hot = g.severity === 'high' || g.severity === 'critical'
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
                <rect
                  key={i}
                  x={-s / 2}
                  y={-s / 2}
                  width={s}
                  height={s}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth="3"
                  className={`${uid}-ring`}
                  style={{ ['--d' as string]: `${sev.ring * (quiet ? 1.8 : 1)}s`, animationDelay: `${i * (sev.ring / 2)}s` }}
                />
              ))}
              {hot && (
                <g fill={meta.color}>
                  <rect x={s / 2 + 3} y={-s / 2 - 9} width="7" height="7" />
                  <rect x={s / 2 + 12} y={-s / 2 - 3} width="5" height="5" opacity="0.8" />
                  <rect x={s / 2 - 2} y={-s / 2 - 17} width="5" height="5" opacity="0.7" />
                </g>
              )}
              <rect x={-s / 2 + 3} y={-s / 2 + 4} width={s} height={s} fill="rgb(10 6 16 / 0.8)" />
              <rect x={-s / 2} y={-s / 2} width={s} height={s} fill={meta.color} fillOpacity={sev.opacity} stroke="#fff" strokeWidth="2.5" strokeDasharray={quiet ? '5 3' : undefined} />
              <rect x={-s / 2 + 3} y={-s / 2 + 3} width={s - 6} height={(s - 6) * 0.3} fill="#fff" opacity="0.35" />
              {g.severity === 'critical' && <path d={`M ${-2} ${-s / 2 + 5} L ${-5} 0 L 2 1 L ${-2} ${s / 2 - 5}`} fill="none" stroke="#fff" strokeWidth="2.4" />}
              <rect x={-s / 2 - 10} y={-s / 2 - 10} width={s + 20} height={s + 20} fill="transparent" />
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
                <rect x={x} y={y} width={w} height="48" fill="var(--panel)" stroke={GLITCH_TYPE_META[hovered.type].color} strokeWidth="2" />
                <text x={x + 12} y={y + 20} fontSize="13" fontWeight={700} fill={GLITCH_TYPE_META[hovered.type].color} letterSpacing="1">
                  {GLITCH_TYPE_META[hovered.type].label.toUpperCase()} · {hovered.severity.toUpperCase()} · {hovered.status}
                </text>
                <text x={x + 12} y={y + 38} fontSize="14" fill="var(--fg)">
                  {text}
                </text>
              </g>
            )
          })()}

        {/* compass + HUD corner brackets */}
        <g transform="translate(70 76)" opacity="0.8">
          <path d="M0 -34 L7 0 L0 34 L-7 0 Z" fill="var(--fg)" opacity="0.35" />
          <path d="M-34 0 L0 -6 L34 0 L0 6 Z" fill="var(--fg)" opacity="0.2" />
          <path d="M0 -34 L7 0 L-7 0 Z" fill="var(--accent)" />
          <text y="-42" textAnchor="middle" fontSize="15" fontWeight={800} fill="var(--fg)" className="font-display">
            N
          </text>
        </g>
        {!compact && (
          <text x="500" y="40" textAnchor="middle" fontSize="22" letterSpacing="16" fill="var(--fg)" opacity="0.4" className="font-display" fontWeight={700}>
            ACHRONA
          </text>
        )}
        <g fill="none" stroke="var(--accent)" strokeWidth="4">
          <path d="M8 40 V8 H40" />
          <path d="M992 660 V692 H960" />
        </g>
      </svg>
      {unlocated > 0 && !compact && (
        <span className="absolute right-3 bottom-3 rounded-sm border border-line bg-panel px-3 py-1 text-xs text-muted">
          +{unlocated} glitch{unlocated === 1 ? '' : 'es'} with no known district
        </span>
      )}
    </div>
  )
}
