/**
 * @file Route /glitches/$glitchId — Glitch detail (PageHeader, status stepper, echo timeline, district mini-map,
 * commander panel with AI assignee suggestion, runbook slot). Live-refreshes on glitch/echo events. j/k are not used here; `Esc`/`b` go back.
 * @usedBy router
 */
import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '#/components/ui/Button.tsx'
import { PageHeader } from '#/components/ui/PageHeader.tsx'
import { RunbookPanel } from '#/components/ai/RunbookPanel.tsx'
import { CommanderPanel } from '#/components/glitches/CommanderPanel.tsx'
import { AchronaMap } from '#/components/map/AchronaMap.tsx'
import { EchoTimeline } from '#/components/glitches/EchoTimeline.tsx'
import { GlitchTypeIcon, SeverityBadge, StatusBadge, TimeAgo } from '#/components/glitches/badges.tsx'
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
      <div>
        <PageHeader label="Glitch" title="Not found" subtitle="This glitch does not exist or was removed." />
        <Link to="/" className="text-accent-ink underline">
          Back to overview
        </Link>
      </div>
    )
  }
  const { glitch, echoes, assignee, me } = detail
  const isCommander = me?.role === 'commander'
  const district = DISTRICTS.find((d) => d.id === glitch.districtId)
  const typeMeta = GLITCH_TYPE_META[glitch.type]

  return (
    <div className="flex flex-col gap-5">
      <Link to="/" className="-mb-2 inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Overview
      </Link>
      <PageHeader
        label={`${glitch.glitchId} · ${typeMeta.label}`}
        title={typeMeta.label}
        subtitle={<span className="text-lg text-fg">{glitch.description}</span>}
        actions={
          <Button variant="secondary" onClick={() => setReportOpen(true)} title="Report an echo (n)">
            <Plus className="size-4" /> Report echo
          </Button>
        }
      />

      <section className="glass rounded-lg p-4 sm:p-5">
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <GlitchTypeIcon type={glitch.type} className="size-6" />
          <span className="font-mono text-sm text-fg">{glitch.glitchId}</span>
          <StatusBadge status={glitch.status} />
          <SeverityBadge severity={glitch.severity} />
          <span className="text-muted">
            {district?.name ?? 'Unknown district'} · opened <TimeAgo iso={glitch.timestamp} suffix=" ago" /> · {glitch.echoCount ?? 0} {glitch.echoCount === 1 ? 'echo' : 'echoes'} ·{' '}
            {assignee ? (
              <>
                assigned to <span className="font-semibold text-fg">{assignee.guardianId === me?.guardianId ? 'you' : assignee.codename}</span>
              </>
            ) : (
              'unassigned'
            )}
          </span>
        </div>
        <StatusStepper status={glitch.status} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="glass h-fit rounded-lg p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold tracking-wide uppercase text-fg">Echo timeline</h2>
            <span className="label">{echoes.length} echoes</span>
          </div>
          <EchoTimeline echoes={echoes} isCommander={isCommander} />
        </section>
        <aside className="space-y-5">
          {isCommander && <CommanderPanel glitch={glitch} />}
          <AchronaMap glitches={[glitch]} compact className="aspect-[10/7] w-full" />
          <RunbookPanel glitch={glitch} canGenerate={me?.role === 'commander'} />
        </aside>
      </div>

      <ReportEchoDialog open={reportOpen} onClose={() => setReportOpen(false)} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
