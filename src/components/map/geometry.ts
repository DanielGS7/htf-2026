/**
 * @file Hand-tuned geometry for the Achrona map (viewBox 1000x700): landmass and river paths, roads
 * between districts, a deterministic organic blob per district, and marker placement helpers.
 * @exports LANDMASS, RIVER, MOUNTAINS, ROADS, districtBlob, markerOffset, hash
 * @usedBy src/components/map/AchronaMap.tsx
 */
import type { DistrictId } from '#/lib/glitch.ts'

export const LANDMASS =
  'M 90 360 C 60 280 110 190 200 135 C 290 80 410 95 500 70 C 610 42 720 70 810 100 C 900 130 960 220 945 320 C 935 395 965 455 945 540 C 925 625 835 668 730 660 C 650 653 600 680 500 676 C 400 672 330 655 260 664 C 170 675 90 640 75 575 C 62 525 95 485 88 440 C 82 405 100 385 90 360 Z'

/** A second, slightly inset outline: the shoreline surf. */
export const SHORE =
  'M 104 362 C 76 284 122 202 208 150 C 296 98 412 112 500 88 C 606 60 716 86 804 116 C 888 146 940 228 927 320 C 917 396 947 458 928 538 C 910 612 828 650 730 642 C 648 635 598 662 500 658 C 402 654 332 637 262 646 C 178 657 106 626 92 572 C 80 526 112 486 106 440 C 100 402 116 384 104 362 Z'

export const RIVER =
  'M 690 84 C 640 150 700 225 625 282 C 565 328 470 300 432 382 C 402 446 340 472 300 546 C 268 604 226 626 150 652 L 126 668'

export const MOUNTAINS: { x: number; y: number; s: number }[] = [
  { x: 560, y: 128, s: 1.2 },
  { x: 605, y: 142, s: 0.9 },
  { x: 520, y: 146, s: 0.8 },
  { x: 650, y: 120, s: 0.7 },
  { x: 380, y: 112, s: 0.8 },
  { x: 420, y: 124, s: 1.0 },
  { x: 905, y: 330, s: 0.8 },
  { x: 892, y: 372, s: 0.6 },
]

/** Roads as [from, to, bend]. `bend` shifts the quadratic control point sideways. */
export const ROADS: [DistrictId, DistrictId, number][] = [
  ['citadel', 'archives', 30],
  ['citadel', 'clocktower', -30],
  ['citadel', 'market', 20],
  ['citadel', 'forest', -40],
  ['archives', 'harbor', 40],
  ['harbor', 'market', -50],
  ['market', 'forest', 40],
  ['clocktower', 'forest', 30],
  ['archives', 'clocktower', -90],
]

export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A closed, smooth, organic region centred on (cx, cy), deterministic per district id. */
export function districtBlob(id: string, cx: number, cy: number, radius: number): string {
  const rand = rng(hash(id))
  const n = 11
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = radius * (0.74 + rand() * 0.4)
    pts.push([cx + Math.cos(a) * r * 1.12, cy + Math.sin(a) * r * 0.88])
  }
  // Catmull-Rom -> cubic bezier
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d + ' Z'
}

/** Marker position on the rim of a district; `index`/`total` spread siblings, hash adds stable jitter. */
export function markerOffset(glitchId: string, index: number, total: number): [number, number] {
  const h = hash(glitchId)
  // Keep markers off the label area (below the centre): spread over the upper 270 degrees first.
  const span = Math.PI * 1.15
  const start = Math.PI * 1.0 + ((h % 100) / 100) * 0.4
  const a = start + (total <= 1 ? 0.7 : (index / (total - 1)) * span) + (((h >>> 8) % 100) / 100 - 0.5) * 0.3
  const r = 84 + ((h >>> 16) % 16) + (index % 2) * 10
  return [Math.cos(a) * r * 1.1, Math.sin(a) * r * 0.82 - 4]
}
