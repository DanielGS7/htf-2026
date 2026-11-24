/**
 * @file Echo timeline for a glitch: vertical line with diamond nodes, reporter codename (font-display), time, text, photo.
 * Rejected echoes are muted with their reason
 * (the server only sends them to commanders / the reporter). Commanders can move an echo to another
 * glitch or into a new one (overrides AI grouping).
 * @exports EchoTimeline
 * @usedBy src/routes/glitches.$glitchId.tsx
 */
import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { ArrowRightLeft, Ban, EyeOff } from 'lucide-react'
import { getGlitches, moveEcho } from '#/lib/glitches.functions.ts'
import type { Echo, Glitch } from '#/lib/glitch.ts'
import { TimeAgo } from './badges.tsx'

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
        className="max-w-[9rem] rounded-sm border border-line bg-subtle px-1 py-0.5 text-xs text-fg"
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
  if (!echoes.length) return <p className="text-muted">No echoes yet. Report one to add evidence.</p>
  return (
    <ol className="relative ml-1.5 border-l-2 border-line">
      {echoes.map((e) => {
        const rejected = e.moderation === 'rejected'
        return (
          <li key={e.echoId} className="relative pb-5 pl-6 last:pb-0">
            <span
              aria-hidden="true"
              className={`absolute top-1.5 -left-[7px] size-3 rotate-45 border-2 border-card ${rejected ? 'bg-muted' : 'bg-accent'}`}
            />
            <div className={rejected ? 'opacity-60' : ''}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-base font-bold tracking-wide text-fg">{e.reporterCodename ?? 'Unknown'}</span>
                <time dateTime={e.timestamp} title={e.timestamp} suppressHydrationWarning className="font-mono text-xs text-muted">
                  <TimeAgo iso={e.timestamp} suffix=" ago" />
                </time>
                <span className="font-mono text-xs text-muted">{e.echoId}</span>
                {isCommander && (
                  <span className="ml-auto">
                    <MoveControl echo={e} />
                  </span>
                )}
              </div>
              <p className={`mt-1 text-fg ${rejected ? 'line-through decoration-muted/60' : ''}`}>{e.description}</p>
              {e.imageUrl && <EchoPhoto src={e.imageUrl} />}
            </div>
            {rejected && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-sm border border-danger/40 bg-danger/10 px-2 py-0.5 text-xs text-danger">
                <Ban className="size-3" /> Rejected{e.moderationReason ? `: ${e.moderationReason}` : ''}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** Photos skip AI moderation, so they stay blurred until someone chooses to look (safe on the projector). */
function EchoPhoto({ src }: { src: string }) {
  const [shown, setShown] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setShown((v) => !v)}
      title={shown ? 'Hide photo' : 'Show photo'}
      aria-label={shown ? 'Hide photo' : 'Show photo'}
      className="relative mt-2 block overflow-hidden rounded-md border border-line"
    >
      <img src={src} alt="" className={`max-h-48 transition duration-300 ${shown ? '' : 'scale-125 blur-2xl brightness-50'}`} />
      {!shown && (
        <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 text-sm font-semibold tracking-wide text-white uppercase">
          <EyeOff className="size-4" /> Unchecked photo, tap to show
        </span>
      )}
    </button>
  )
}
