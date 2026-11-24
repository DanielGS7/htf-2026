/**
 * @file Dense glitch table for the overview: type icon (type colour), mono ID, severity, status, district, echoes,
 * assignee, age. Critical rows get a red left edge, FIXED rows are dimmed, rows flash (.glitch) when `flash`
 * contains their id; `selectedId` is the j/k cursor. Column order is relied on by e2e (echoes = 6th td).
 * @exports GlitchList
 * @usedBy src/routes/index.tsx
 */
import { Link, useNavigate } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'
import { DISTRICTS, type Glitch } from '#/lib/glitch.ts'
import { GlitchTypeIcon, SeverityBadge, StatusBadge, timeAgo } from './badges.tsx'


const districtName = (id: string | null) => DISTRICTS.find((d) => d.id === id)?.name ?? '-'
const TH = 'px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted'

export function GlitchList({
  glitches,
  names,
  flash,
  selectedId,
  meId,
}: {
  glitches: Glitch[]
  names: Record<string, string>
  flash: ReadonlySet<string>
  selectedId: string | null
  meId: string | null
}) {
  const navigate = useNavigate()
  if (!glitches.length) {
    return (
      <div className="glass flex flex-col items-center gap-3 rounded-lg border-dashed px-6 py-8 text-center sm:flex-row sm:text-left">
        <img src="/htf/character-3.avif" alt="" aria-hidden="true" className="h-28 w-auto shrink-0" />
        <div>
          <p className="font-display text-xl font-bold uppercase tracking-wide text-fg">No glitches match</p>
          <p className="mt-1 text-muted">Achrona is calm, or the filters are too narrow. Clear them to see the full log.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="glass overflow-x-auto rounded-lg">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-panel">
          <tr>
            {['', 'Glitch', 'Severity', 'Status', 'District', 'Echoes', 'Assignee', 'Age'].map((h, i) => (
              <th key={i} className={TH}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-fg">
          {glitches.map((g) => {
            const critical = g.severity === 'critical' && g.status !== 'FIXED'
            const fixed = g.status === 'FIXED'
            return (
              <tr
                key={g.glitchId}
                data-glitch-id={g.glitchId}
                onClick={() => navigate({ to: '/glitches/$glitchId', params: { glitchId: g.glitchId } })}
                className={`cursor-pointer border-t border-line transition-colors duration-1000 hover:bg-subtle ${
                  flash.has(g.glitchId) ? 'glitch bg-magic/20 !duration-150' : ''
                } ${selectedId === g.glitchId ? 'outline-2 -outline-offset-2 outline-accent' : ''} ${fixed ? 'opacity-55' : ''}`}
              >
                <td className={`w-10 py-2 pr-1 pl-3 ${critical ? 'shadow-[inset_3px_0_0_var(--danger)]' : ''}`}>
                  <GlitchTypeIcon type={g.type} className="size-5" />
                </td>
                <td className="max-w-md px-3 py-2">
                  <Link
                    to="/glitches/$glitchId"
                    params={{ glitchId: g.glitchId }}
                    onClick={(e) => e.stopPropagation()}
                    className={`font-medium hover:text-accent-ink hover:underline ${fixed ? 'line-through decoration-muted/60' : ''}`}
                  >
                    {g.description}
                  </Link>
                  <div className="mt-0.5 font-mono text-xs text-muted">{g.glitchId}</div>
                </td>
                <td className="px-3 py-2">
                  <SeverityBadge severity={g.severity} />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={g.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted">{districtName(g.districtId)}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 font-display font-bold tabular-nums text-fg">
                    <MessageSquare className="size-3.5 text-muted" aria-hidden="true" />
                    {g.echoCount ?? 0}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {g.assigneeId ? (
                    <span className={g.assigneeId === meId ? 'font-semibold text-accent-ink' : 'text-fg'}>
                      {g.assigneeId === meId ? 'You' : (names[g.assigneeId] ?? '?')}
                    </span>
                  ) : (
                    <span className="text-muted">Unassigned</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted" title={g.timestamp}>
                  <time dateTime={g.timestamp} suppressHydrationWarning>
                    {timeAgo(g.timestamp)}
                  </time>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
