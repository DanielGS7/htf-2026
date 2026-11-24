/**
 * @file Badge primitive: squared status tag (tight radius, uppercase, tracked), tinted by tone.
 * @exports Badge
 */
import type { ComponentProps } from 'react'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'magic'

const TONES: Record<Tone, string> = {
  neutral: 'bg-subtle text-muted border-line',
  accent: 'bg-accent/15 text-accent-ink border-accent/40',
  success: 'bg-success/15 text-success border-success/40',
  warning: 'bg-warning/15 text-warning border-warning/40',
  danger: 'bg-danger/15 text-danger border-danger/40',
  magic: 'bg-magic/20 text-magic-soft border-magic/50',
}

export function Badge({
  tone = 'neutral',
  className = '',
  ...props
}: ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs leading-4 font-semibold tracking-wider uppercase [font-stretch:92%] ${TONES[tone]} ${className}`}
      {...props}
    />
  )
}
