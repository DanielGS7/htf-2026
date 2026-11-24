/**
 * @file Shared domain model: statuses, roles, glitch types, districts and the
 * plain TS types passed between server functions and components.
 * @exports GLITCH_STATUSES, GlitchStatus, ROLES, Role, GLITCH_TYPES, GlitchType,
 *   GLITCH_TYPE_META, SEVERITIES, Severity, DISTRICTS, DistrictId, District,
 *   Glitch, Echo, Guardian, SensorReading, nextStatus
 * @usedBy everything (client + server safe: no imports, no side effects)
 */

/** Lifecycle of a glitch, in order. */
export const GLITCH_STATUSES = ['LEAKED', 'ASSESSING', 'CONTAINING', 'FIXED'] as const
export type GlitchStatus = (typeof GLITCH_STATUSES)[number]

/** The status after `s`, or null when the glitch is already FIXED. */
export function nextStatus(s: GlitchStatus): GlitchStatus | null {
  const i = GLITCH_STATUSES.indexOf(s)
  return GLITCH_STATUSES[i + 1] ?? null
}

export const ROLES = ['defender', 'commander'] as const
export type Role = (typeof ROLES)[number]

export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
export type Severity = (typeof SEVERITIES)[number]

/** AI-assigned category of a glitch. Icons are lucide-react component names. */
export const GLITCH_TYPES = [
  'TIME_LOOP',
  'MAGIC_DRAIN',
  'PORTAL_FLICKER',
  'ECHO_STORM',
  'MEMORY_LEAK',
  'REALITY_TEAR',
  'UNKNOWN',
] as const
export type GlitchType = (typeof GLITCH_TYPES)[number]

/** Colours come from the HTF 2026 palette (see docs/DESIGN.md), distinct enough to tell apart on a projector. */
export const GLITCH_TYPE_META: Record<GlitchType, { label: string; icon: string; color: string }> = {
  TIME_LOOP: { label: 'Time loop', icon: 'Hourglass', color: '#f48d30' },
  MAGIC_DRAIN: { label: 'Magic drain', icon: 'BatteryLow', color: '#c04df0' },
  PORTAL_FLICKER: { label: 'Portal flicker', icon: 'CircleDashed', color: '#3ccfb4' },
  ECHO_STORM: { label: 'Echo storm', icon: 'Radio', color: '#e292f4' },
  MEMORY_LEAK: { label: 'Memory leak', icon: 'Droplets', color: '#5b8cff' },
  REALITY_TEAR: { label: 'Reality tear', icon: 'Zap', color: '#ff5a3c' },
  UNKNOWN: { label: 'Unknown', icon: 'HelpCircle', color: '#a3a1bb' },
}

/**
 * The districts of Achrona. `x`/`y` are the district's centre on the
 * 1000x700 SVG map (src/components/map/AchronaMap.tsx).
 */
export const DISTRICTS = [
  { id: 'clocktower', name: 'Eastern Clock Tower', x: 780, y: 220 },
  { id: 'archives', name: 'Archive Vaults', x: 260, y: 200 },
  { id: 'citadel', name: 'Crystal Citadel', x: 500, y: 330 },
  { id: 'harbor', name: 'Mistveil Harbor', x: 180, y: 520 },
  { id: 'market', name: 'Rune Market', x: 520, y: 560 },
  { id: 'forest', name: 'Whispering Forest', x: 820, y: 520 },
] as const
export type District = (typeof DISTRICTS)[number]
export type DistrictId = District['id']

export type Guardian = {
  guardianId: string
  codename: string
  role: Role
}

export type Glitch = {
  glitchId: string
  status: GlitchStatus
  /** Short headline, AI-written (falls back to the first echo's description). */
  description: string
  /** ISO 8601 creation time. */
  timestamp: string
  type: GlitchType
  severity: Severity
  districtId: DistrictId | null
  assigneeId: string | null
  /** Markdown runbook, AI-generated on demand. */
  runbook: string | null
  /** ISO 8601 last change. */
  updatedAt: string
  /** Number of echoes grouped under this glitch (joined, not stored). */
  echoCount?: number
}

export type Echo = {
  echoId: string
  glitchId: string | null
  description: string
  /** ISO 8601 */
  timestamp: string
  reportingGuardianId: string
  districtId: DistrictId | null
  /** 'ok' | 'rejected' (AI moderation) */
  moderation: 'ok' | 'rejected'
  moderationReason: string | null
  /** Optional data: URL or /uploads path. */
  imageUrl: string | null
  /** Joined for display. */
  reporterCodename?: string
}

export type SensorReading = {
  districtId: DistrictId
  /** 0-100, 100 = healthy. */
  magic: number
  timestamp: string
}
