/**
 * @file Card shown after an echo is submitted: a scroll banner with the short verdict (new glitch /
 * grouped / closed / reopened / rejected, plus "queued offline" and error variants), the glitch id in
 * mono and a `+points` pop. Rejected is muted with the reason. Respects reduced motion.
 * @exports OutcomeCard, Outcome (type)
 * @usedBy src/components/field/EchoComposer.tsx
 */
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { FieldResult } from '#/lib/field.functions.ts'

export type Outcome = { kind: 'result'; data: FieldResult; delayed?: boolean } | { kind: 'queued'; count: number } | { kind: 'error'; message: string }

const CSS = `
@keyframes gg-pop{0%{transform:scale(.94) translateY(8px);opacity:0}60%{transform:scale(1.02);opacity:1}100%{transform:none}}
@keyframes gg-points{0%{transform:translateY(10px) scale(.4);opacity:0}55%{transform:translateY(-4px) scale(1.25);opacity:1}100%{transform:none}}
.gg-pop{animation:gg-pop .4s cubic-bezier(.2,1.2,.4,1) both}
.gg-points{animation:gg-points .6s .2s cubic-bezier(.2,1.4,.4,1) both}
@media (prefers-reduced-motion:reduce){.gg-pop,.gg-points{animation:none}}
`

export function OutcomeCard({ outcome }: { outcome: Outcome }) {
  let tone = 'border-accent/50'
  let tag = 'Echo received'
  let title: ReactNode = null
  let sub: ReactNode = null
  let points = 0
  let muted = false

  if (outcome.kind === 'queued') {
    tone = 'border-warning/50'
    tag = 'Offline'
    title = 'Queued: will send when the connection returns'
    sub = `${outcome.count} echo${outcome.count === 1 ? '' : 'es'} saved on this phone. Keep this page open.`
  } else if (outcome.kind === 'error') {
    tone = 'border-danger/50'
    tag = 'Error'
    title = 'That did not go through'
    sub = outcome.message
  } else {
    const { outcome: o, glitch, rejectReason, gained } = outcome.data
    const id = glitch ? (
      <Link to="/glitches/$glitchId" params={{ glitchId: glitch.glitchId }} className="font-mono underline decoration-dotted underline-offset-4">
        {glitch.glitchId}
      </Link>
    ) : null
    points = gained
    tone = o === 'rejected' ? 'border-line' : o === 'resolved' ? 'border-success/60' : o === 'reopened' ? 'border-warning/60' : 'border-accent/60'
    if (o === 'new-glitch') {
      tag = 'First to report'
      title = <>New glitch opened {id}</>
      sub = glitch?.description
    } else if (o === 'grouped') {
      tag = 'Echo confirmed'
      const n = glitch?.echoCount ?? 1
      title = <>Grouped with {id}</>
      sub = `${n} guardian${n === 1 ? '' : 's'} reported this`
    } else if (o === 'resolved') {
      tag = 'Glitch fixed'
      title = <>You closed {id}</>
      sub = 'Good news travels fast. Achrona thanks you.'
    } else if (o === 'reopened') {
      tag = 'It came back'
      title = <>Reopened {id}</>
      sub = 'The commanders have been alerted.'
    } else {
      muted = true
      tag = 'Not recorded'
      title = <>Rejected: {rejectReason ?? 'the echo could not be verified'}</>
      sub = 'Describe what you actually see or hear in Achrona.'
    }
    if (outcome.delayed) sub = <>{sub} (sent from the offline queue)</>
  }

  return (
    <div role="status" className={`gg-pop glass overflow-hidden rounded-lg border-2 ${tone} ${muted ? 'opacity-90' : ''}`}>
      <style>{CSS}</style>
      <div className="relative flex min-h-16 items-center justify-between gap-3 px-4 py-3">
        {/* Parchment scroll behind the verdict; text sits on a solid ink-on-parchment surface. */}
        <img src="/htf/scroll.avif" alt="" aria-hidden className={`pointer-events-none absolute inset-0 size-full object-fill ${muted ? 'grayscale opacity-60' : ''}`} />
        <div className="relative min-w-0 flex-1 px-4 text-center">
          <p className="font-mono text-[11px] font-semibold tracking-[0.16em] text-[#5b3a21] uppercase">{tag}</p>
          <p className="font-display text-base leading-snug font-bold break-words text-[#1d1427] [font-stretch:92%]">{title}</p>
        </div>
      </div>
      <div className="flex items-start justify-between gap-3 p-4">
        <p className={`min-w-0 text-sm break-words ${muted ? 'text-muted' : 'text-fg'}`}>{sub}</p>
        {points > 0 && (
          <span className="gg-points shrink-0 font-display text-4xl leading-none font-bold text-success tabular-nums">+{points}</span>
        )}
      </div>
    </div>
  )
}
