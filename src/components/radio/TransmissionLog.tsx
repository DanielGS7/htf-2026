/**
 * @file Log of transmissions sent from the radio desk: heard text, trigger, district and outcome.
 * The newest entry uses the full OutcomeCard, older ones a compact line.
 * @exports TransmissionLog
 * @usedBy src/routes/radio.tsx
 */
import { Link } from '@tanstack/react-router'
import { Badge } from '#/components/ui/Badge.tsx'
import { OutcomeCard } from '#/components/field/OutcomeCard.tsx'
import type { RadioEntry } from '#/lib/useRadio.ts'
import { DISTRICTS } from '#/lib/glitch.ts'

function verdict(e: RadioEntry) {
  if (e.outcome === 'sending') return { tone: 'neutral' as const, text: 'Sending' }
  if (e.outcome.kind === 'error') return { tone: 'danger' as const, text: 'Error' }
  if (e.outcome.kind === 'queued') return { tone: 'warning' as const, text: 'Queued' }
  const o = e.outcome.data.outcome
  if (o === 'new-glitch') return { tone: 'accent' as const, text: 'New glitch' }
  if (o === 'grouped') return { tone: 'success' as const, text: 'Grouped' }
  if (o === 'rejected') return { tone: 'neutral' as const, text: 'Rejected' }
  return { tone: 'warning' as const, text: o === 'resolved' ? 'Fixed' : 'Reopened' }
}

export function TransmissionLog({ log }: { log: RadioEntry[] }) {
  if (!log.length) {
    return <p className="text-lg text-muted">No transmissions yet. Talk into the walkie and end with "over".</p>
  }
  return (
    <ol className="flex flex-col gap-3">
      {log.map((e, idx) => {
        const v = verdict(e)
        const district = DISTRICTS.find((d) => d.id === e.districtId)?.name
        const glitchId = e.outcome !== 'sending' && e.outcome.kind === 'result' ? e.outcome.data.glitch?.glitchId : null
        return (
          <li key={e.id} className="rounded-lg border border-line bg-subtle p-3">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
              <span>{new Date(e.at).toLocaleTimeString()}</span>
              <Badge tone={v.tone}>{v.text}</Badge>
              <Badge>{e.trigger === 'over' ? 'Over' : e.trigger === 'silence' ? 'Pause' : 'Manual'}</Badge>
              {district && <Badge tone="magic">{district}</Badge>}
              {idx > 0 && glitchId && (
                <Link to="/glitches/$glitchId" params={{ glitchId }} className="underline decoration-dotted underline-offset-4">
                  {glitchId}
                </Link>
              )}
            </div>
            <p className="mt-2 text-lg leading-snug break-words">{e.text}</p>
            {idx === 0 && e.outcome !== 'sending' && (
              <div className="mt-3">
                <OutcomeCard outcome={e.outcome} />
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
