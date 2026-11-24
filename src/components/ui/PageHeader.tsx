/**
 * @file Page header used by every in-app page: HUD label, HTF blackletter title (extruded), one-line
 * subtitle and optional actions on the right. The gothic title is the ONE blackletter element per page.
 * @exports PageHeader
 * @usedBy src/routes/* (all signed-in pages)
 * @example <PageHeader label="Mission log" title="Overview" subtitle="3 open glitches" actions={<Button/>} />
 */
import type { ReactNode } from 'react'

export function PageHeader({
  label,
  title,
  subtitle,
  actions,
}: {
  /** Small mono label above the title, e.g. "Mission log". */
  label?: string
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {label && <p className="label mb-1">{label}</p>}
        <h1 className="font-gothic text-5xl sm:text-6xl">{title}</h1>
        {/* div, not p: subtitle may contain block elements (e.g. SimStatus on /admin). */}
        {subtitle && <div className="mt-3 text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
