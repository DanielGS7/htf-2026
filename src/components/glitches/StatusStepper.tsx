/**
 * @file Horizontal LEAKED -> ASSESSING -> CONTAINING -> FIXED track in the DESIGN.md status colours: reached
 * stages are filled, the current stage is lit with its colour, later stages are hollow. On phones only the
 * current stage is labelled (four labels don't fit 360px). Commanders can click a step to jump.
 * @exports StatusStepper
 * @usedBy src/routes/glitches.$glitchId.tsx
 */
import { Check } from 'lucide-react'
import { GLITCH_STATUSES, type GlitchStatus } from '#/lib/glitch.ts'

const COLOR: Record<GlitchStatus, { text: string; bg: string; border: string; outline: string }> = {
  LEAKED: { text: 'text-danger', bg: 'bg-danger', border: 'border-danger', outline: 'outline-danger' },
  ASSESSING: { text: 'text-warning', bg: 'bg-warning', border: 'border-warning', outline: 'outline-warning' },
  CONTAINING: { text: 'text-info-ink', bg: 'bg-info', border: 'border-info', outline: 'outline-info' },
  FIXED: { text: 'text-success', bg: 'bg-success', border: 'border-success', outline: 'outline-success' },
}

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
    <ol className="flex items-start" aria-label="Status progress">
      {GLITCH_STATUSES.map((s, i) => {
        const reached = i <= current
        const active = i === current
        const c = COLOR[s]
        const canPick = !!onPick && !disabled && !active
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-[15px] right-1/2 h-0.5 w-full ${i <= current ? COLOR[GLITCH_STATUSES[i - 1]].bg : 'bg-line'}`}
              />
            )}
            <button
              type="button"
              disabled={!canPick}
              onClick={() => onPick?.(s)}
              title={onPick ? `Set status to ${s}` : s}
              className="group relative flex flex-col items-center gap-1.5 disabled:cursor-default"
            >
              <span
                className={`flex size-8 items-center justify-center rounded-sm border-2 ${
                  active
                    ? `${c.bg} ${c.border} ${c.outline} text-[#160f1f] outline-2 outline-offset-2`
                    : reached
                      ? `${c.border} bg-card ${c.text}`
                      : 'border-line bg-card text-muted group-enabled:group-hover:border-fg'
                }`}
              >
                {reached && !active ? <Check className="size-4" /> : <span className={`font-mono text-sm font-bold ${active ? 'text-[#160f1f]' : ''}`}>{i + 1}</span>}
              </span>
              <span className={`font-mono text-[12px] font-semibold tracking-[0.12em] uppercase ${active ? '' : 'max-sm:hidden'} ${active ? c.text : reached ? 'text-fg' : 'text-muted'}`}>{s}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
