/**
 * @file Reusable glitch badges: type icon (in its type colour), squared status and severity tags on the DESIGN.md scales.
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
      {withLabel && <span className="text-xs font-semibold uppercase tracking-wide text-fg">{meta.label}</span>}
    </span>
  )
}

/** Squared tag: tinted fill + border in the status colour (DESIGN.md status scale). */
export const STATUS_STYLE: Record<GlitchStatus, string> = {
  LEAKED: 'bg-danger/15 text-danger border-danger/50',
  ASSESSING: 'bg-warning/15 text-warning border-warning/50',
  CONTAINING: 'bg-accent/15 text-accent-ink border-accent/50',
  FIXED: 'bg-success/15 text-success border-success/50',
}

const TAG = 'inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase leading-none tracking-[0.1em]'

export function StatusBadge({ status }: { status: GlitchStatus }) {
  return <span className={`${TAG} ${STATUS_STYLE[status]}`}>{status}</span>
}

/** Severity scale: low = muted, medium = accent, high = warning, critical = danger + pulse. */
export const SEVERITY_STYLE: Record<Severity, string> = {
  low: 'bg-muted/10 text-muted border-muted/40',
  medium: 'bg-accent/15 text-accent-ink border-accent/50',
  high: 'bg-warning/15 text-warning border-warning/50',
  critical: 'bg-danger/20 text-danger border-danger/60 animate-pulse',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`${TAG} ${SEVERITY_STYLE[severity]}`}>{severity}</span>
}

/** Compact relative time: 12s, 5m, 3h, 2d. */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}
