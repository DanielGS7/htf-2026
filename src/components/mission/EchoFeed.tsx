/**
 * @file Live echo feed for the big screen: newest first, district tag, reporter, relative time, big type.
 * Echoes rejected by AI moderation are shown struck-through with the reason.
 * @exports EchoFeed
 * @usedBy src/routes/mission.tsx
 */
import { useEffect, useState } from 'react'
import { Ban, Radio } from 'lucide-react'
import { DISTRICTS, type Echo } from '#/lib/glitch.ts'
import { timeAgo } from '#/components/glitches/badges.tsx'

export function EchoFeed({ echoes, limit = 12 }: { echoes: Echo[]; limit?: number }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])

  if (!echoes.length) {
    return (
      <div className="flex h-full items-center justify-center gap-4 text-muted">
        <Radio className="size-9 opacity-70" />
        <p className="font-display text-2xl font-semibold">Listening for echoes. Guardian reports appear here live.</p>
      </div>
    )
  }
  return (
    <ul className="flex min-h-0 flex-col gap-2 overflow-hidden">
      {echoes.slice(0, limit).map((e, i) => {
        const district = DISTRICTS.find((d) => d.id === e.districtId)?.name
        const rejected = e.moderation === 'rejected'
        return (
          <li
            key={e.echoId}
            className={`float-in border-l-4 py-1 pr-2 pl-3 ${rejected ? 'border-danger bg-danger/5' : i === 0 ? 'border-magic bg-magic/10' : 'border-line'}`}
          >
            <div className="flex items-center gap-2 text-sm text-muted">
              {rejected ? <Ban className="size-4 text-danger" /> : <Radio className="size-4 text-accent" />}
              <span className="font-display text-base font-bold tracking-wide text-fg uppercase">{e.reporterCodename ?? 'Guardian'}</span>
              {district && <span className="truncate">in {district}</span>}
              <span className="ml-auto shrink-0 font-mono">{now ? timeAgo(e.timestamp, now) : ''}</span>
            </div>
            <p className={`line-clamp-2 text-xl leading-snug font-medium ${rejected ? 'text-muted line-through' : 'text-fg'}`}>{e.description}</p>
            {rejected && <p className="text-sm font-semibold text-danger">Rejected by moderation{e.moderationReason ? `: ${e.moderationReason}` : ''}</p>}
          </li>
        )
      })}
    </ul>
  )
}
