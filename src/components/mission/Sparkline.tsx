/**
 * @file Hand-rolled SVG sparkline with area fill and an end dot, coloured by the latest magic value.
 * @exports Sparkline
 * @usedBy src/components/mission/DistrictSparklines.tsx, src/routes/admin.tsx
 */
import { useId } from 'react'
import { magicColor } from './magicColor.ts'

export function Sparkline({ values, width = 160, height = 40, className = '' }: { values: number[]; width?: number; height?: number; className?: string }) {
  const uid = useId().replace(/:/g, '')
  const last = values[values.length - 1] ?? 100
  const color = magicColor(last)
  const pad = 4
  const pts = values.length > 1 ? values : [last, last]
  const x = (i: number) => pad + (i * (width - pad * 2)) / (pts.length - 1)
  const y = (v: number) => pad + (1 - Math.max(0, Math.min(100, v)) / 100) * (height - pad * 2)
  const line = pts.map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L ${x(pts.length - 1).toFixed(1)} ${height} L ${x(0).toFixed(1)} ${height} Z`
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`${uid}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid}a)`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(pts.length - 1)} cy={y(last)} r="3.5" fill={color} />
    </svg>
  )
}
