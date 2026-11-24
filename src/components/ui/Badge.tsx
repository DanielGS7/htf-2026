/**
 * @file Badge primitive (small pill). Tones map to theme tokens.
 * @exports Badge
 */
import type { ComponentProps } from 'react'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const TONES: Record<Tone, string> = {
  neutral: 'bg-subtle text-muted border-line',
  accent: 'bg-accent/15 text-accent border-accent/30',
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
}

export function Badge({
  tone = 'neutral',
  className = '',
  ...props
}: ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
      {...props}
    />
  )
}
