/**
 * @file Animated magic gauge: a 240-degree SVG arc that eases to the current level, colour-graded
 * violet -> amber -> red with a glow, tick marks and a status word. Omit `level` and it
 * self-subscribes to the live `magic.level` event (initial value from getOpsSnapshot).
 * @exports MagicGauge
 * @usedBy src/routes/mission.tsx, src/routes/admin.tsx, src/components/glitches/OverviewOps.tsx
 */
import { useEffect, useId, useRef, useState } from 'react'
import { magicColor, magicStatus } from './magicColor.ts'
import { useMagicLevel } from './useOpsLive.ts'

const START = 150 // degrees, 0 = 3 o'clock, clockwise (SVG), arc sweeps 240 degrees
const SWEEP = 240
const C = 150
const R = 112

function polar(deg: number, r = R) {
  const a = (deg * Math.PI) / 180
  return [Math.round((C + r * Math.cos(a)) * 100) / 100, Math.round((C + r * Math.sin(a)) * 100) / 100] as const
}
function arc(from: number, to: number, r = R) {
  const [x0, y0] = polar(from, r)
  const [x1, y1] = polar(to, r)
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}
const TRACK = arc(START, START + SWEEP)

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
  const [ex, ey] = polar(START + (SWEEP * pct) / 100)

  return (
    <div
      className={`relative mx-auto aspect-square w-full select-none ${big ? 'max-w-[26rem]' : 'max-w-[11rem]'}`}
      role="meter"
      aria-label="Magic level"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <svg viewBox="0 0 300 300" className="size-full overflow-visible">
        <defs>
          <filter id={`${uid}g`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <radialGradient id={`${uid}c`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <style>{`
          @keyframes ${uid}-spin { to { transform: rotate(360deg); } }
          @keyframes ${uid}-pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
          .${uid}-ring { transform-origin: 150px 150px; animation: ${uid}-spin 40s linear infinite; }
          .${uid}-crit { animation: ${uid}-pulse .9s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .${uid}-ring, .${uid}-crit { animation: none; } }
        `}</style>
        <circle cx={C} cy={C} r="128" fill={`url(#${uid}c)`} />
        {/* slow rotating rune ring */}
        <g className={`${uid}-ring`} opacity="0.35">
          <circle cx={C} cy={C} r="140" fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="2 9" />
          <circle cx={C} cy={C} r="86" fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="1 6" />
        </g>
        {/* ticks */}
        {Array.from({ length: 25 }, (_, i) => {
          const deg = START + (SWEEP * i) / 24
          const [x0, y0] = polar(deg, R + 12)
          const [x1, y1] = polar(deg, R + (i % 6 === 0 ? 24 : 18))
          const lit = (i / 24) * 100 <= pct
          return (
            <line
              key={i}
              x1={x0}
              y1={y0}
              x2={x1}
              y2={y1}
              stroke={lit ? color : 'var(--line)'}
              strokeWidth={i % 6 === 0 ? 2.5 : 1.5}
              strokeLinecap="round"
              opacity={lit ? 0.9 : 0.7}
            />
          )
        })}
        {/* track */}
        <path d={TRACK} fill="none" stroke="var(--line)" strokeWidth="18" strokeLinecap="round" opacity="0.55" />
        {/* glow */}
        <path
          d={TRACK}
          pathLength={100}
          fill="none"
          stroke={color}
          strokeWidth="22"
          strokeLinecap="round"
          strokeDasharray={`${pct} 100`}
          filter={`url(#${uid}g)`}
          opacity="0.75"
          className={critical ? `${uid}-crit` : undefined}
        />
        {/* value */}
        <path d={TRACK} pathLength={100} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${pct} 100`} />
        <path d={TRACK} pathLength={100} fill="none" stroke="white" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${pct} 100`} transform="translate(0 -3)" />
        {pct > 1 && <circle cx={ex} cy={ey} r="9" fill="white" stroke={color} strokeWidth="4" />}
        {/* readout */}
        <text x={C} y={big ? 160 : 168} textAnchor="middle" className="font-display" fontSize={big ? 76 : 70} fontWeight={800} fill="var(--fg)">
          {live === null ? '--' : Math.round(pct)}
          {live !== null && (
            <tspan fontSize={big ? 30 : 28} fill={color} dx="3">
              %
            </tspan>
          )}
        </text>
        <text x={C} y={big ? 196 : 200} textAnchor="middle" fontSize="16" fontWeight={700} letterSpacing="4" fill={color} className={critical ? `${uid}-crit` : undefined}>
          {status}
        </text>
        {big && (
          <text x={C} y={226} textAnchor="middle" fontSize="12" letterSpacing="5" fill="var(--muted)">
            ACHRONA MAGIC
          </text>
        )}
      </svg>
    </div>
  )
}
