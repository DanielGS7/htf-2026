/**
 * @file Dense glitch table for the overview: type icon, severity, status, district, echoes, assignee, age.
 * Rows flash when `flash` contains their id; `selectedId` is the j/k cursor.
 * @exports GlitchList
 * @usedBy src/routes/index.tsx
 */
import { Link, useNavigate } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'
import { DISTRICTS, type Glitch } from '#/lib/glitch.ts'
import { GlitchTypeIcon, SeverityBadge, StatusBadge, timeAgo } from './badges.tsx'

const districtName = (id: string | null) => DISTRICTS.find((d) => d.id === id)?.name ?? '-'

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
      <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
        No glitches match these filters. Achrona is calm, or try clearing the filters.
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-subtle text-xs uppercase tracking-wide text-muted">
          <tr>
            {['', 'Glitch', 'Severity', 'Status', 'District', 'Echoes', 'Assignee', 'Age'].map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-fg">
          {glitches.map((g) => (
            <tr
              key={g.glitchId}
              data-glitch-id={g.glitchId}
              onClick={() => navigate({ to: '/glitches/$glitchId', params: { glitchId: g.glitchId } })}
              className={`cursor-pointer border-t border-line transition-colors duration-1000 hover:bg-subtle ${
                flash.has(g.glitchId) ? 'bg-accent/20 !duration-150' : ''
              } ${selectedId === g.glitchId ? 'outline outline-2 -outline-offset-2 outline-accent' : ''} ${g.status === 'FIXED' ? 'opacity-60' : ''}`}
            >
              <td className="px-3 py-2.5">
                <GlitchTypeIcon type={g.type} className="size-5" />
              </td>
              <td className="max-w-md px-3 py-2.5">
                <Link to="/glitches/$glitchId" params={{ glitchId: g.glitchId }} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline">
                  {g.description}
                </Link>
                <div className="font-mono text-[11px] text-muted">{g.glitchId}</div>
              </td>
              <td className="px-3 py-2.5">
                <SeverityBadge severity={g.severity} />
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={g.status} />
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-muted">{districtName(g.districtId)}</td>
              <td className="px-3 py-2.5">
                <span className="inline-flex items-center gap-1 text-muted">
                  <MessageSquare className="size-3.5" />
                  {g.echoCount ?? 0}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                {g.assigneeId ? (
                  <span className={g.assigneeId === meId ? 'font-semibold text-accent' : ''}>
                    {g.assigneeId === meId ? 'You' : (names[g.assigneeId] ?? '?')}
                  </span>
                ) : (
                  <span className="text-muted">Unassigned</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-muted" title={g.timestamp}>
                <time dateTime={g.timestamp} suppressHydrationWarning>
                  {timeAgo(g.timestamp)}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
