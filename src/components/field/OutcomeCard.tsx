/**
 * @file Animated card shown after an echo is submitted: new glitch / grouped / closed / reopened /
 * rejected, plus "queued offline" and error variants. Confetti burst + points pop (respects reduced motion).
 * @exports OutcomeCard, Outcome (type)
 * @usedBy src/components/field/EchoComposer.tsx
 */
import { Link } from '@tanstack/react-router'
import { CheckCircle2, CloudOff, Link2, RotateCcw, ShieldX, Sparkles, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { FieldResult } from '#/lib/field.functions.ts'

export type Outcome = { kind: 'result'; data: FieldResult; delayed?: boolean } | { kind: 'queued'; count: number } | { kind: 'error'; message: string }

const CSS = `
@keyframes gg-pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.06);opacity:1}100%{transform:scale(1)}}
@keyframes gg-burst{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.4);opacity:0}}
@keyframes gg-points{0%{transform:translateY(8px) scale(.5);opacity:0}30%{opacity:1}100%{transform:translateY(-6px) scale(1)}}
.gg-pop{animation:gg-pop .45s cubic-bezier(.2,1.4,.4,1) both}
.gg-points{animation:gg-points .7s .15s ease-out both}
.gg-bit{position:absolute;left:50%;top:38px;width:8px;height:8px;border-radius:2px;animation:gg-burst .9s ease-out forwards}
@media (prefers-reduced-motion:reduce){.gg-pop,.gg-points{animation:none}.gg-bit{display:none}}
`
const BITS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2
  const r = 70 + (i % 3) * 22
  return { dx: Math.cos(a) * r, dy: Math.sin(a) * r - 10, color: ['var(--accent)', 'var(--success)', 'var(--warning)', '#22d3ee'][i % 4] }
})

export function OutcomeCard({ outcome }: { outcome: Outcome }) {
  let tone = 'border-accent/40'
  let icon: ReactNode = <Sparkles className="size-7 text-accent" />
  let title: ReactNode = null
  let sub: ReactNode = null
  let points = 0
  let party = false

  if (outcome.kind === 'queued') {
    tone = 'border-warning/50'
    icon = <CloudOff className="size-7 text-warning" />
    title = 'Queued: will send when the connection returns'
    sub = `${outcome.count} echo${outcome.count === 1 ? '' : 'es'} saved on this phone. Keep this page open.`
  } else if (outcome.kind === 'error') {
    tone = 'border-danger/50'
    icon = <TriangleAlert className="size-7 text-danger" />
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
    party = o !== 'rejected'
    tone = o === 'rejected' ? 'border-danger/50' : o === 'resolved' ? 'border-success/60' : 'border-accent/50'
    if (o === 'new-glitch') {
      icon = <Sparkles className="size-7 text-accent" />
      title = <>New glitch opened {id}</>
      sub = glitch?.description
    } else if (o === 'grouped') {
      icon = <Link2 className="size-7 text-accent" />
      const n = glitch?.echoCount ?? 1
      title = <>Grouped with {id}</>
      sub = `${n} guardian${n === 1 ? '' : 's'} reported this`
    } else if (o === 'resolved') {
      icon = <CheckCircle2 className="size-7 text-success" />
      title = <>You closed {id}</>
      sub = 'Good news travels fast. Achrona thanks you.'
    } else if (o === 'reopened') {
      icon = <RotateCcw className="size-7 text-warning" />
      title = <>Reopened {id}</>
      sub = 'It came back. The commanders have been alerted.'
    } else {
      icon = <ShieldX className="size-7 text-danger" />
      title = <>Rejected: {rejectReason ?? 'the echo could not be verified'}</>
      sub = 'Describe what you actually see or hear in Achrona.'
    }
    if (outcome.delayed) sub = <>{sub} (sent from the offline queue)</>
  }

  return (
    <div role="status" className={`gg-pop glass relative overflow-hidden rounded-2xl border-2 p-4 ${tone}`}>
      <style>{CSS}</style>
      {party && BITS.map((b, i) => <span key={i} aria-hidden className="gg-bit" style={{ '--dx': `${b.dx}px`, '--dy': `${b.dy}px`, background: b.color } as React.CSSProperties} />)}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-snug font-semibold break-words">{title}</p>
          {sub && <p className="mt-1 text-sm text-muted break-words">{sub}</p>}
        </div>
        {points > 0 && (
          <span className="gg-points shrink-0 rounded-full bg-success/15 px-3 py-1 text-lg font-bold text-success">+{points}</span>
        )}
      </div>
    </div>
  )
}
