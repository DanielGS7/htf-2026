/**
 * @file Reusable glitch badges: type icon, status pill, severity pill.
 * @exports GlitchTypeIcon, StatusBadge, SeverityBadge, STATUS_STYLE, SEVERITY_STYLE, timeAgo
 * @usedBy src/components/glitches/*, src/routes/index.tsx, other work packages
 */
import { BatteryLow, CircleDashed, Droplets, Hourglass, HelpCircle, Radio, Zap, type LucideIcon } from 'lucide-react'
import { GLITCH_TYPE_META, type GlitchStatus, type GlitchType, type Severity } from '#/lib/glitch.ts'

const ICONS: Record<string, LucideIcon> = { Hourglass, BatteryLow, CircleDashed, Radio, Droplets, Zap, HelpCircle }

export function GlitchTypeIcon({ type, className = 'size-4', withLabel = false }: { type: GlitchType; className?: string; withLabel?: boolean }) {
  const meta = GLITCH_TYPE_META[type]
  const Icon = ICONS[meta.icon] ?? HelpCircle
  return (
    <span className="inline-flex items-center gap-1.5" title={meta.label}>
      <Icon className={className} style={{ color: meta.color }} aria-label={meta.label} />
      {withLabel && <span className="text-xs text-muted">{meta.label}</span>}
    </span>
  )
}

export const STATUS_STYLE: Record<GlitchStatus, string> = {
  LEAKED: 'bg-red-500/15 text-red-500 border-red-500/30',
  ASSESSING: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  CONTAINING: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
  FIXED: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
}

export function StatusBadge({ status }: { status: GlitchStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  )
}

export const SEVERITY_STYLE: Record<Severity, string> = {
  low: 'bg-zinc-500/15 text-muted border-zinc-500/30',
  medium: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  high: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  critical: 'bg-red-600/20 text-red-500 border-red-500/40 font-bold',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${SEVERITY_STYLE[severity]}`}>
      {severity}
    </span>
  )
}

/** Compact relative time: 12s, 5m, 3h, 2d. */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}
