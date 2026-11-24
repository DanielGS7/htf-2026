/**
 * @file Live echo feed for the big screen: newest first, district tag, reporter, relative time.
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
      <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center text-muted">
        <Radio className="size-8 opacity-60" />
        <p className="text-lg">Listening for echoes...</p>
        <p className="text-sm">Reports from guardians appear here live.</p>
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-2 overflow-hidden">
      {echoes.slice(0, limit).map((e) => {
        const district = DISTRICTS.find((d) => d.id === e.districtId)?.name
        const rejected = e.moderation === 'rejected'
        return (
          <li
            key={e.echoId}
            className={`float-in rounded-xl border px-3 py-2 ${rejected ? 'border-danger/30 bg-danger/5' : 'border-line bg-subtle/60'}`}
          >
            <div className="flex items-center gap-2 text-xs text-muted">
              {rejected ? <Ban className="size-3.5 text-danger" /> : <Radio className="size-3.5 text-accent" />}
              <span className="font-semibold text-fg">{e.reporterCodename ?? 'Guardian'}</span>
              {district && <span className="truncate">in {district}</span>}
              <span className="ml-auto shrink-0 font-mono">{now ? timeAgo(e.timestamp, now) : ''}</span>
            </div>
            <p className={`mt-0.5 line-clamp-2 text-base leading-snug ${rejected ? 'text-muted line-through' : 'text-fg'}`}>{e.description}</p>
            {rejected && <p className="mt-0.5 text-xs font-semibold text-danger">Rejected by moderation{e.moderationReason ? `: ${e.moderationReason}` : ''}</p>}
          </li>
        )
      })}
    </ul>
  )
}
