/**
 * @file Echo timeline for a glitch: reporter codename, time, text, photo. Rejected echoes are greyed
 * (the server only sends them to commanders / the reporter). Commanders can move an echo to another
 * glitch or into a new one (overrides AI grouping).
 * @exports EchoTimeline
 * @usedBy src/routes/glitches.$glitchId.tsx
 */
import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { ArrowRightLeft, Ban } from 'lucide-react'
import { getGlitches, moveEcho } from '#/lib/glitches.functions.ts'
import type { Echo, Glitch } from '#/lib/glitch.ts'
import { timeAgo } from './badges.tsx'

function MoveControl({ echo }: { echo: Echo }) {
  const router = useRouter()
  const [options, setOptions] = useState<Glitch[] | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!options) setOptions((await getGlitches()).filter((g) => g.glitchId !== echo.glitchId))
  }
  async function move(to: string) {
    if (!to) return
    setBusy(true)
    try {
      await moveEcho({ data: { echoId: echo.echoId, toGlitchId: to === '__new' ? null : to } })
      await router.invalidate()
    } finally {
      setBusy(false)
      setOptions(null)
    }
  }
  return (
    <label className="inline-flex items-center gap-1 text-xs text-muted" title="Move this echo to another glitch">
      <ArrowRightLeft className="size-3.5" />
      <select
        disabled={busy}
        value=""
        onFocus={load}
        onMouseEnter={load}
        onChange={(e) => void move(e.target.value)}
        aria-label="Move echo"
        className="max-w-[9rem] rounded border border-line bg-card px-1 py-0.5 text-xs text-fg"
      >
        <option value="">Move to...</option>
        <option value="__new">+ New glitch</option>
        {options?.map((g) => (
          <option key={g.glitchId} value={g.glitchId}>
            {g.glitchId} {g.description.slice(0, 30)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function EchoTimeline({ echoes, isCommander }: { echoes: Echo[]; isCommander: boolean }) {
  if (!echoes.length) return <p className="text-sm text-muted">No echoes yet. Report one to add evidence.</p>
  return (
    <ol className="relative space-y-3 border-l border-line pl-4">
      {echoes.map((e) => {
        const rejected = e.moderation === 'rejected'
        return (
          <li key={e.echoId} className={`relative ${rejected ? 'opacity-50' : ''}`}>
            <span className={`absolute -left-[21px] top-1.5 size-2.5 rounded-full ${rejected ? 'bg-red-500' : 'bg-accent'}`} />
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span className="font-semibold text-fg">{e.reporterCodename ?? 'Unknown'}</span>
              <time dateTime={e.timestamp} title={e.timestamp} suppressHydrationWarning>
                {timeAgo(e.timestamp)} ago
              </time>
              <span className="font-mono">{e.echoId}</span>
              {rejected && (
                <span className="inline-flex items-center gap-1 text-red-500">
                  <Ban className="size-3" /> Rejected{e.moderationReason ? `: ${e.moderationReason}` : ''}
                </span>
              )}
              {isCommander && <span className="ml-auto"><MoveControl echo={e} /></span>}
            </div>
            <p className={`mt-0.5 text-sm text-fg ${rejected ? 'line-through' : ''}`}>{e.description}</p>
            {e.imageUrl && <img src={e.imageUrl} alt="Echo attachment" className="mt-2 max-h-48 rounded-lg border border-line" />}
          </li>
        )
      })}
    </ol>
  )
}
