/**
 * @file Horizontal LEAKED -> ASSESSING -> CONTAINING -> FIXED stepper. Commanders can click a step to jump.
 * @exports StatusStepper
 * @usedBy src/routes/glitches.$glitchId.tsx
 */
import { Check } from 'lucide-react'
import { GLITCH_STATUSES, type GlitchStatus } from '#/lib/glitch.ts'

export function StatusStepper({
  status,
  onPick,
  disabled,
}: {
  status: GlitchStatus
  onPick?: (s: GlitchStatus) => void
  disabled?: boolean
}) {
  const current = GLITCH_STATUSES.indexOf(status)
  return (
    <ol className="flex items-center gap-1" aria-label="Status progress">
      {GLITCH_STATUSES.map((s, i) => {
        const done = i < current || status === 'FIXED'
        const active = i === current
        const cls = active
          ? 'border-accent bg-accent text-white'
          : done
            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-500'
            : 'border-line text-muted'
        return (
          <li key={s} className="flex flex-1 items-center gap-1">
            <button
              type="button"
              disabled={!onPick || disabled || active}
              onClick={() => onPick?.(s)}
              title={onPick ? `Set status to ${s}` : s}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold ${cls} ${onPick && !active ? 'hover:brightness-110' : 'cursor-default'}`}
            >
              {done && <Check className="size-3.5" />}
              {s}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
