/**
 * @file Hand-rolled SVG sparkline (stepped line, flat tinted area, square end block), coloured by the latest magic value.
 * @exports Sparkline
 * @usedBy src/components/mission/DistrictSparklines.tsx, src/routes/admin.tsx
 */
import { magicColor } from './magicColor.ts'

export function Sparkline({ values, width = 160, height = 40, className = '' }: { values: number[]; width?: number; height?: number; className?: string }) {
  const last = values[values.length - 1] ?? 100
  const color = magicColor(last)
  const pad = 4
  const pts = values.length > 1 ? values : [last, last]
  const x = (i: number) => pad + (i * (width - pad * 2)) / (pts.length - 1)
  const y = (v: number) => pad + (1 - Math.max(0, Math.min(100, v)) / 100) * (height - pad * 2)
  const line = pts
    .map((v, i) => (i ? `L ${x(i).toFixed(1)} ${y(pts[i - 1]).toFixed(1)} L ${x(i).toFixed(1)} ${y(v).toFixed(1)}` : `M ${x(i).toFixed(1)} ${y(v).toFixed(1)}`))
    .join(' ')
  const area = `${line} L ${x(pts.length - 1).toFixed(1)} ${height} L ${x(0).toFixed(1)} ${height} Z`
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none" aria-hidden>
      <path d={area} fill={color} fillOpacity="0.16" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="miter" vectorEffect="non-scaling-stroke" />
      <rect x={x(pts.length - 1) - 3.5} y={y(last) - 3.5} width="7" height="7" fill={color} />
    </svg>
  )
}
