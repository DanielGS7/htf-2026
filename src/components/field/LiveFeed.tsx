/**
 * @file Compact live feed of the latest glitches on /report so the room sees its impact. Rows link to detail.
 * @exports LiveFeed
 * @usedBy src/routes/report.tsx
 */
import { Link } from '@tanstack/react-router'
import { GlitchTypeIcon, SeverityBadge, StatusBadge, timeAgo } from '#/components/glitches/badges.tsx'
import type { Glitch } from '#/lib/glitch.ts'

export function LiveFeed({ glitches }: { glitches: Glitch[] }) {
  if (!glitches.length) {
    return <p className="glass rounded-lg p-4 text-sm text-muted">No glitches yet. Achrona is calm. Be the first to report one.</p>
  }
  return (
    <ul className="flex flex-col gap-2">
      {glitches.map((g) => (
        <li key={g.glitchId}>
          <Link
            to="/glitches/$glitchId"
            params={{ glitchId: g.glitchId }}
            className="glass float-in flex min-h-14 items-center gap-3 rounded-lg p-3 active:translate-y-px"
          >
            <GlitchTypeIcon type={g.type} className="size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{g.description}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                <span className="font-mono">{g.glitchId}</span>
                <StatusBadge status={g.status} />
                <SeverityBadge severity={g.severity} />
                <span>{g.echoCount ?? 0} echo{g.echoCount === 1 ? '' : 'es'}</span>
              </p>
            </div>
            <span className="shrink-0 font-mono text-xs text-muted">{timeAgo(g.updatedAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
