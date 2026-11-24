/**
 * @file Route /glitches/$glitchId — Glitch detail: status stepper, echo timeline, district mini-map,
 * commander controls, runbook slot. Live-refreshes on glitch/echo events. j/k are not used here; `Esc`/`b` go back.
 * @usedBy router
 */
import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { CommanderPanel } from '#/components/glitches/CommanderPanel.tsx'
import { DistrictMiniMap } from '#/components/glitches/DistrictMiniMap.tsx'
import { EchoTimeline } from '#/components/glitches/EchoTimeline.tsx'
import { GlitchTypeIcon, SeverityBadge, StatusBadge, timeAgo } from '#/components/glitches/badges.tsx'
import { ReportEchoDialog } from '#/components/glitches/ReportEchoDialog.tsx'
import { ShortcutsHelp } from '#/components/glitches/ShortcutsHelp.tsx'
import { StatusStepper } from '#/components/glitches/StatusStepper.tsx'
import { useGlitchLive } from '#/components/glitches/useGlitchLive.ts'
import { getGlitchDetail } from '#/lib/glitches.functions.ts'
import { DISTRICTS, GLITCH_TYPE_META } from '#/lib/glitch.ts'
import { useShortcuts } from '#/lib/useShortcuts.ts'

export const Route = createFileRoute('/glitches/$glitchId')({
  loader: ({ params }) => getGlitchDetail({ data: { glitchId: params.glitchId } }),
  component: GlitchDetailPage,
})

function GlitchDetailPage() {
  const detail = Route.useLoaderData()
  const navigate = useNavigate()
  useGlitchLive()
  const [reportOpen, setReportOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  useShortcuts(
    {
      n: () => setReportOpen(true),
      '?': () => setHelpOpen(true),
      Escape: () => void navigate({ to: '/' }),
      'g m': () => void navigate({ to: '/mission' }),
      'g o': () => void navigate({ to: '/' }),
    },
    !reportOpen && !helpOpen,
  )

  if (!detail) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-fg">Glitch not found</h1>
        <Link to="/" className="text-accent underline">
          Back to overview
        </Link>
      </div>
    )
  }
  const { glitch, echoes, assignee, me } = detail
  const isCommander = me?.role === 'commander'
  const district = DISTRICTS.find((d) => d.id === glitch.districtId)

  return (
    <div className="flex flex-col gap-5">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Overview
      </Link>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <GlitchTypeIcon type={glitch.type} className="size-6" />
          <span className="font-mono text-sm text-muted">{glitch.glitchId}</span>
          <StatusBadge status={glitch.status} />
          <SeverityBadge severity={glitch.severity} />
          <span className="text-sm text-muted">{GLITCH_TYPE_META[glitch.type].label}</span>
        </div>
        <h1 className="text-2xl font-semibold text-fg">{glitch.description}</h1>
        <p className="text-sm text-muted">
          {district?.name ?? 'Unknown district'} · opened {timeAgo(glitch.timestamp)} ago · {glitch.echoCount ?? 0} echoes ·{' '}
          {assignee ? (
            <>
              assigned to <span className="font-semibold text-fg">{assignee.guardianId === me?.guardianId ? 'you' : assignee.codename}</span>
            </>
          ) : (
            'unassigned'
          )}
        </p>
      </header>

      <StatusStepper status={glitch.status} />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {isCommander && <CommanderPanel glitch={glitch} />}
          <section className="rounded-2xl border border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Echo timeline</h2>
              <button type="button" onClick={() => setReportOpen(true)} title="Report an echo (n)" className="rounded-lg bg-subtle px-2.5 py-1 text-xs text-fg hover:bg-subtle-hover">
                Report echo
              </button>
            </div>
            <EchoTimeline echoes={echoes} isCommander={isCommander} />
          </section>
        </div>
        <aside className="space-y-5">
          <DistrictMiniMap districtId={glitch.districtId} color={GLITCH_TYPE_META[glitch.type].color} />
          {/* TODO(WP-D): replace with <RunbookPanel glitch={glitch} canGenerate={isCommander} /> from #/components/ai/RunbookPanel.tsx */}
          <section className="rounded-2xl border border-dashed border-line p-4 text-sm">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Runbook</h2>
            {glitch.runbook ? <pre className="whitespace-pre-wrap text-fg">{glitch.runbook}</pre> : <p className="text-muted">No runbook yet.</p>}
          </section>
        </aside>
      </div>

      <ReportEchoDialog open={reportOpen} onClose={() => setReportOpen(false)} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
