/**
 * @file Magic gauge in the HUD look: a stepped 240-degree arc of 24 voxel segments that lights up to the
 * current level (blue/teal -> purple -> orange -> red as magic drains), a huge Saira number and a status
 * word. Omit `level` and it self-subscribes to the live `magic.level` event (initial value from
 * getOpsSnapshot). Exposes `role="meter"` / `aria-label="Magic level"` / `aria-valuenow`.
 * @exports MagicGauge
 * @usedBy src/routes/mission.tsx, src/routes/admin.tsx, src/components/glitches/OverviewOps.tsx
 */
import { useEffect, useId, useRef, useState } from 'react'
import { magicColor, magicStatus } from './magicColor.ts'
import { useMagicLevel } from './useOpsLive.ts'

const START = 150 // degrees, 0 = 3 o'clock, clockwise (SVG); the arc sweeps 240 degrees
const SWEEP = 240
const C = 150
const R_OUT = 142
const R_IN = 112
const SEGMENTS = 24
const GAP = 2.2 // degrees between segments

function pt(deg: number, r: number) {
  const a = (deg * Math.PI) / 180
  return `${(C + r * Math.cos(a)).toFixed(1)},${(C + r * Math.sin(a)).toFixed(1)}`
}
/** One voxel segment as a straight-edged quad (no curves: blocky on purpose). */
const QUADS = Array.from({ length: SEGMENTS }, (_, i) => {
  const a0 = START + (SWEEP / SEGMENTS) * i + GAP / 2
  const a1 = START + (SWEEP / SEGMENTS) * (i + 1) - GAP / 2
  return `${pt(a0, R_OUT)} ${pt(a1, R_OUT)} ${pt(a1, R_IN)} ${pt(a0, R_IN)}`
})

/** Ease a number toward `target` (for the big counter). */
function useTween(target: number, ms = 900) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const e = 1 - Math.pow(1 - t, 3)
      const cur = a + (target - a) * e
      from.current = cur
      setV(cur)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

export function MagicGauge({ level, size = 'lg' }: { level?: number; size?: 'sm' | 'lg' }) {
  const live = useMagicLevel(level)
  const target = live ?? 0
  const shown = useTween(target)
  const uid = useId().replace(/:/g, '')
  const color = magicColor(shown)
  const status = live === null ? 'SCANNING' : magicStatus(target)
  const critical = live !== null && target < 40
  const big = size === 'lg'
  const pct = Math.max(0, Math.min(100, shown))
  const lit = Math.round((pct / 100) * SEGMENTS)

  return (
    <div
      className={`relative mx-auto aspect-[300/252] w-full select-none ${big ? 'max-w-[min(32rem,52vh)]' : 'max-w-[11rem]'}`}
      role="meter"
      aria-label="Magic level"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <svg viewBox="0 4 300 252" className="size-full overflow-visible">
        <style>{`
          @keyframes ${uid}-pulse { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
          .${uid}-crit { animation: ${uid}-pulse .8s steps(2, end) infinite; }
          .${uid}-seg { transition: fill .5s steps(3, end), stroke .5s steps(3, end); }
          @media (prefers-reduced-motion: reduce) { .${uid}-crit { animation: none; } }
        `}</style>
        {/* inner plate */}
        <circle cx={C} cy={C} r="104" fill="var(--panel)" stroke="var(--line)" strokeWidth="2" />
        <circle cx={C} cy={C} r="96" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 7" />
        {QUADS.map((q, i) => {
          const on = i < lit
          return (
            <polygon
              key={i}
              points={q}
              className={`${uid}-seg ${on && critical && i >= lit - 3 ? `${uid}-crit` : ''}`}
              style={{ fill: on ? color : 'var(--card-strong)', stroke: on ? 'rgb(10 6 16 / 0.7)' : 'var(--line)' }}
              strokeWidth="2"
              strokeLinejoin="miter"
            />
          )
        })}
        {/* end caps: small blocks at 0 and 100 */}
        <text x={pt(START + 6, R_OUT + 14).split(',')[0]} y={Number(pt(START + 6, R_OUT + 14).split(',')[1]) + 14} fontSize="12" fontWeight={700} fill="var(--muted)" className="font-mono" textAnchor="middle">
          0
        </text>
        <text x={pt(START + SWEEP - 6, R_OUT + 14).split(',')[0]} y={Number(pt(START + SWEEP - 6, R_OUT + 14).split(',')[1]) + 14} fontSize="12" fontWeight={700} fill="var(--muted)" className="font-mono" textAnchor="middle">
          100
        </text>
        {/* readout */}
        <text x={C} y={C + 36} textAnchor="middle" className="font-display" fontSize="112" fontWeight={800} fill="var(--fg)" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {live === null ? '--' : Math.round(pct)}
        </text>
        <text x={C} y={C + 76} textAnchor="middle" fontSize="23" fontWeight={800} letterSpacing="7" fill={color} className={`font-display ${critical ? `${uid}-crit` : ''}`}>
          {status}
        </text>
        {big && (
          <text x={C} y={C - 66} textAnchor="middle" fontSize="12" letterSpacing="5" fill="var(--muted)" className="font-mono">
            MAGIC %
          </text>
        )}
      </svg>
    </div>
  )
}
