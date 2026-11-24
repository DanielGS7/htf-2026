/**
 * @file Route /council: official "Report to the High Council of Achrona" (commander only; friendly
 * forbidden state otherwise). "Download PDF" calls window.print(); scoped @media print styles hide the
 * app chrome and force a white page.
 * @usedBy router
 */
import { createFileRoute } from '@tanstack/react-router'
import { Lock, Printer, ScrollText } from 'lucide-react'
import { SeverityBadge, StatusBadge } from '#/components/glitches/badges.tsx'
import { getCouncilReport, type CouncilReport } from '#/lib/field.functions.ts'
import { GLITCH_TYPE_META } from '#/lib/glitch.ts'

export const Route = createFileRoute('/council')({
  loader: () => getCouncilReport(),
  component: CouncilPage,
})

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 16mm; }
  html, body { background: #fff !important; color: #000 !important; }
  body { background-image: none !important; }
  aside, nav, .no-print, .lockdown-frame, [aria-live] { display: none !important; }
  main { padding: 0 !important; }
  .council-sheet { box-shadow: none !important; border: none !important; background: #fff !important; color: #000 !important; max-width: none !important; padding: 0 !important; }
  .council-sheet * { color: #000 !important; border-color: #999 !important; background: transparent !important; backdrop-filter: none !important; }
  .council-sheet table { page-break-inside: auto; }
  .council-sheet tr, .council-sheet .keep { page-break-inside: avoid; }
  .council-sheet h2 { page-break-after: avoid; }
  .council-break { page-break-before: always; }
}
`

const fmtMinutes = (m: number | null) => (m === null ? 'n/a (nothing fixed yet)' : m < 90 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} h`)

function CouncilPage() {
  const report = Route.useLoaderData()
  if ('forbidden' in report) {
    return (
      <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-center">
        <Lock className="size-10 text-muted" />
        <h1 className="text-2xl font-bold">The High Council is in session</h1>
        <p className="text-muted">Only commanders may read the report to the High Council. Ask a commander to open it, or head back to the overview.</p>
      </div>
    )
  }
  return <Sheet r={report} />
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="keep rounded-xl border border-line p-3">
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

function Sheet({ r }: { r: CouncilReport }) {
  const date = new Date(r.generatedAt).toLocaleString()
  return (
    <div className="mx-auto max-w-4xl">
      <style>{PRINT_CSS}</style>
      <div className="no-print mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          title="Opens the print dialog: choose 'Save as PDF'"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-linear-to-br from-accent-from to-accent-to px-5 font-semibold text-on-accent shadow-[0_0_24px_-4px_var(--glow)]"
        >
          <Printer className="size-5" /> Download PDF
        </button>
      </div>

      <article className="council-sheet glass rounded-2xl p-6 md:p-10">
        <header className="border-b-2 border-double border-line pb-5 text-center">
          <ScrollText className="mx-auto size-9 text-accent" />
          <p className="mt-2 font-mono text-xs tracking-[0.3em] text-muted uppercase">Achrona Mission Control · Official dispatch</p>
          <h1 className="mt-1 text-3xl font-bold">Report to the High Council of Achrona</h1>
          <p className="mt-1 text-sm text-muted">Issued <time dateTime={r.generatedAt} suppressHydrationWarning>{date}</time></p>
        </header>

        <section className="mt-6" aria-labelledby="c-summary">
          <h2 id="c-summary" className="mb-3 text-lg font-semibold">1. State of the realm</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Magic level" value={`${r.magic}%`} />
            <Stat label="Glitches (total)" value={r.totals.glitches} />
            <Stat label="Still open" value={r.totals.open} />
            <Stat label="Fixed" value={r.totals.fixed} />
            <Stat label="Echoes received" value={r.totals.echoes} />
            <Stat label="Echoes rejected" value={r.totals.rejected} />
            <Stat label="Guardians" value={r.totals.guardians} />
            <Stat label="Mean time to fix" value={fmtMinutes(r.meanFixMinutes)} />
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2" aria-labelledby="c-breakdown">
          <div className="keep">
            <h2 id="c-breakdown" className="mb-2 text-lg font-semibold">2. Glitches by status</h2>
            <Table head={['Status', 'Count']} rows={r.byStatus.map((s) => [<StatusBadge key="s" status={s.status} />, s.count])} />
          </div>
          <div className="keep">
            <h2 className="mb-2 text-lg font-semibold">3. Glitches by type</h2>
            <Table head={['Type', 'Count']} rows={r.byType.map((t) => [GLITCH_TYPE_META[t.type].label, t.count])} empty="No glitches recorded." />
          </div>
        </section>

        <section className="mt-8 keep" aria-labelledby="c-district">
          <h2 id="c-district" className="mb-2 text-lg font-semibold">4. Glitches by district</h2>
          <Table head={['District', 'Open', 'Total']} rows={r.byDistrict.map((d) => [d.name, d.open, d.total])} />
        </section>

        <section className="mt-8" aria-labelledby="c-open">
          <h2 id="c-open" className="mb-2 text-lg font-semibold">5. Open glitches, most severe first</h2>
          <Table
            head={['Id', 'Description', 'Severity', 'Status']}
            rows={r.openGlitches.map((g) => [<span key="i" className="font-mono">{g.glitchId}</span>, g.description, <SeverityBadge key="s" severity={g.severity} />, <StatusBadge key="t" status={g.status} />])}
            empty="No open glitches. Achrona is at peace."
          />
        </section>

        <section className="mt-8 keep" aria-labelledby="c-top">
          <h2 id="c-top" className="mb-2 text-lg font-semibold">6. Commended defenders</h2>
          <Table head={['#', 'Guardian', 'Points']} rows={r.topDefenders.map((d, i) => [i + 1, d.codename, d.score])} empty="No guardians yet." />
        </section>

        <footer className="mt-10 border-t border-line pt-4 text-center text-xs text-muted">Sealed by the Guardians of the Grid. For the eyes of the High Council only.</footer>
      </article>
    </div>
  )
}

function Table({ head, rows, empty = 'Nothing to report.' }: { head: string[]; rows: React.ReactNode[][]; empty?: string }) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-muted uppercase">
            {head.map((h) => (
              <th key={h} className="px-2 py-1.5 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line/60">
              {row.map((c, j) => (
                <td key={j} className="px-2 py-1.5 align-top">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
