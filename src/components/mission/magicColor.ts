/**
 * @file Shared magic-level colour scale: violet (healthy) -> pink -> amber -> orange -> red (critical),
 * plus a status word per level. Used by the gauge, the map and the sparklines.
 * @exports magicColor, magicRgb, magicStatus
 * @usedBy src/components/mission/*, src/components/map/AchronaMap.tsx
 */

type Stop = [level: number, rgb: [number, number, number]]
const STOPS: Stop[] = [
  [0, [255, 45, 85]],
  [22, [255, 72, 60]],
  [40, [255, 140, 40]],
  [55, [250, 192, 60]],
  [70, [236, 112, 196]],
  [85, [170, 112, 255]],
  [100, [140, 118, 255]],
]

export function magicRgb(level: number): [number, number, number] {
  const v = Math.max(0, Math.min(100, level))
  for (let i = 1; i < STOPS.length; i++) {
    const [hi, c1] = STOPS[i]
    const [lo, c0] = STOPS[i - 1]
    if (v <= hi) {
      const t = (v - lo) / (hi - lo || 1)
      return [0, 1, 2].map((k) => Math.round(c0[k] + (c1[k] - c0[k]) * t)) as [number, number, number]
    }
  }
  return STOPS[STOPS.length - 1][1]
}

export function magicColor(level: number, alpha = 1): string {
  const [r, g, b] = magicRgb(level)
  return alpha >= 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${alpha})`
}

export function magicStatus(level: number): 'STABLE' | 'WEAKENED' | 'UNSTABLE' | 'CRITICAL' {
  if (level >= 80) return 'STABLE'
  if (level >= 60) return 'WEAKENED'
  if (level >= 40) return 'UNSTABLE'
  return 'CRITICAL'
}
