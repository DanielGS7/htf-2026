/**
 * @file Kbd primitive: keycap with a darker bottom edge.
 * @exports Kbd
 */
import type { ComponentProps } from 'react'

export function Kbd({ className = '', ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={`inline-flex min-w-6 items-center justify-center rounded-sm border border-line border-b-2 bg-card-strong px-1.5 py-0.5 font-mono text-xs font-medium text-fg ${className}`}
      {...props}
    />
  )
}
