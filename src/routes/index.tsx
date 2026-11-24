/**
 * @file Route / — Overview (PageHeader, ops strip, filter toolbar, glitch table): live glitch list with search/filter/sort in URL params, "assigned to me",
 * keyboard navigation (j/k/Enter, / search, n new echo, ? help), compact ops widgets.
 * @usedBy router
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus, Search, X } from 'lucide-react'
import { Button } from '#/components/ui/Button.tsx'
import { Kbd } from '#/components/ui/Kbd.tsx'
import { PageHeader } from '#/components/ui/PageHeader.tsx'
import { GlitchList } from '#/components/glitches/GlitchList.tsx'
import { OverviewOps } from '#/components/glitches/OverviewOps.tsx'
import { ReportEchoDialog } from '#/components/glitches/ReportEchoDialog.tsx'
import { ShortcutsHelp } from '#/components/glitches/ShortcutsHelp.tsx'
import { useGlitchLive } from '#/components/glitches/useGlitchLive.ts'
import { getOverview } from '#/lib/glitches.functions.ts'
import { DISTRICTS, GLITCH_STATUSES, GLITCH_TYPES, GLITCH_TYPE_META, SEVERITIES } from '#/lib/glitch.ts'
import { useShortcuts } from '#/lib/useShortcuts.ts'

const SORTS = ['newest', 'severity', 'echoes'] as const
type Search = {
  q?: string
  status?: (typeof GLITCH_STATUSES)[number]
  type?: (typeof GLITCH_TYPES)[number]
  district?: (typeof DISTRICTS)[number]['id']
  severity?: (typeof SEVERITIES)[number]
  sort?: (typeof SORTS)[number]
  mine?: boolean
}

const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined

export const Route = createFileRoute('/')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === 'string' && s.q ? s.q : undefined,
    status: pick(s.status, GLITCH_STATUSES),
    type: pick(s.type, GLITCH_TYPES),
    district: pick(s.district, DISTRICTS.map((d) => d.id)),
    severity: pick(s.severity, SEVERITIES),
    sort: pick(s.sort, SORTS),
    mine: s.mine === true || s.mine === 'true' ? true : undefined,
  }),
  loader: () => getOverview(),
  component: OverviewPage,
})

const SEV_RANK = { low: 0, medium: 1, high: 2, critical: 3 } as const

function OverviewPage() {
  const { glitches, names, me } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const flash = useGlitchLive()
  const searchRef = useRef<HTMLInputElement>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [qDraft, setQDraft] = useState(search.q ?? '')

  useEffect(() => setQDraft(search.q ?? ''), [search.q])
  useEffect(() => {
    if (qDraft === (search.q ?? '')) return
    const t = setTimeout(() => void navigate({ search: (p) => ({ ...p, q: qDraft || undefined }), replace: true }), 250)
    return () => clearTimeout(t)
  }, [qDraft, search.q, navigate])

  const set = (patch: Partial<Search>) => void navigate({ search: (p) => ({ ...p, ...patch }), replace: true })

  const rows = useMemo(() => {
    const q = search.q?.toLowerCase()
    const list = glitches.filter(
      (g) =>
        (!search.status || g.status === search.status) &&
        (!search.type || g.type === search.type) &&
        (!search.district || g.districtId === search.district) &&
        (!search.severity || g.severity === search.severity) &&
        (!search.mine || g.assigneeId === me?.guardianId) &&
        (!q || g.description.toLowerCase().includes(q) || g.glitchId.toLowerCase().includes(q)),
    )
    const sort = search.sort ?? 'newest'
    return [...list].sort((a, b) =>
      sort === 'severity'
        ? SEV_RANK[b.severity] - SEV_RANK[a.severity] || b.timestamp.localeCompare(a.timestamp)
        : sort === 'echoes'
          ? (b.echoCount ?? 0) - (a.echoCount ?? 0)
          : b.timestamp.localeCompare(a.timestamp),
    )
  }, [glitches, search, me])

  const move = (d: 1 | -1) => {
    if (!rows.length) return
    const i = rows.findIndex((g) => g.glitchId === selected)
    const next = rows[Math.min(rows.length - 1, Math.max(0, i === -1 ? (d === 1 ? 0 : rows.length - 1) : i + d))]
    setSelected(next.glitchId)
    document.querySelector(`[data-glitch-id="${next.glitchId}"]`)?.scrollIntoView({ block: 'nearest' })
  }

  useShortcuts(
    {
      j: () => move(1),
      k: () => move(-1),
      Enter: () => selected && void navigate({ to: '/glitches/$glitchId', params: { glitchId: selected } }),
      n: () => setReportOpen(true),
      '/': () => searchRef.current?.focus(),
      '?': () => setHelpOpen(true),
      'g m': () => void navigate({ to: '/mission' }),
      'g o': () => void navigate({ to: '/' }),
    },
    !reportOpen && !helpOpen,
  )

  const open = glitches.filter((g) => g.status !== 'FIXED').length
  const filtered = Boolean(search.q || search.status || search.type || search.district || search.severity || search.mine)
  const sel =
    'h-9 rounded-md border border-line bg-subtle px-2 text-sm text-fg outline-none hover:border-accent/60 focus:border-accent'

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        label="Mission log"
        title="Overview"
        subtitle={
          <>
            {open} open of {glitches.length} glitches. Press <Kbd>?</Kbd> for shortcuts.
          </>
        }
        actions={
          <Button size="lg" onClick={() => setReportOpen(true)} title="Report an echo (n)">
            <Plus className="size-4" /> Report echo
          </Button>
        }
      />

      <OverviewOps glitches={glitches} onSelect={(id) => void navigate({ to: '/glitches/$glitchId', params: { glitchId: id } })} />

      <div className="glass flex flex-wrap items-center gap-2 rounded-lg p-2">
        <label className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted" />
          <input
            ref={searchRef}
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
            placeholder="Search glitches ( / )"
            aria-label="Search glitches"
            className="h-9 w-56 rounded-md border border-line bg-app pr-2 pl-8 text-sm text-fg outline-none focus:border-accent"
          />
        </label>
        <select aria-label="Status" className={sel} value={search.status ?? ''} onChange={(e) => set({ status: pick(e.target.value, GLITCH_STATUSES) })}>
          <option value="">All statuses</option>
          {GLITCH_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select aria-label="Type" className={sel} value={search.type ?? ''} onChange={(e) => set({ type: pick(e.target.value, GLITCH_TYPES) })}>
          <option value="">All types</option>
          {GLITCH_TYPES.map((t) => (
            <option key={t} value={t}>
              {GLITCH_TYPE_META[t].label}
            </option>
          ))}
        </select>
        <select aria-label="District" className={sel} value={search.district ?? ''} onChange={(e) => set({ district: pick(e.target.value, DISTRICTS.map((d) => d.id)) })}>
          <option value="">All districts</option>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select aria-label="Severity" className={sel} value={search.severity ?? ''} onChange={(e) => set({ severity: pick(e.target.value, SEVERITIES) })}>
          <option value="">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select aria-label="Sort" className={sel} value={search.sort ?? 'newest'} onChange={(e) => set({ sort: pick(e.target.value, SORTS) })}>
          <option value="newest">Sort: newest</option>
          <option value="severity">Sort: severity</option>
          <option value="echoes">Sort: echo count</option>
        </select>
        {me && (
          <button
            type="button"
            onClick={() => set({ mine: search.mine ? undefined : true })}
            aria-pressed={!!search.mine}
            className={`h-9 rounded-md border px-3 text-sm font-semibold ${search.mine ? 'border-accent bg-accent/20 text-accent-ink' : 'border-line text-muted hover:text-fg'}`}
          >
            Assigned to me
          </button>
        )}
        {filtered && (
          <button
            type="button"
            onClick={() => void navigate({ search: {}, replace: true })}
            className="inline-flex h-9 items-center gap-1 px-2 text-sm text-muted hover:text-fg"
          >
            <X className="size-3.5" /> Clear
          </button>
        )}
        <span className="label ml-auto pr-2">{rows.length} shown</span>
      </div>

      <GlitchList glitches={rows} names={names} flash={flash} selectedId={selected} meId={me?.guardianId ?? null} />

      <ReportEchoDialog open={reportOpen} onClose={() => setReportOpen(false)} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
