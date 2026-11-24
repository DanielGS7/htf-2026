/**
 * @file Kbd primitive: keyboard key cap.
 * @exports Kbd
 */
import type { ComponentProps } from 'react'

export function Kbd({ className = '', ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={`inline-flex min-w-6 items-center justify-center rounded-md border border-line bg-subtle px-1.5 py-0.5 font-mono text-xs text-muted ${className}`}
      {...props}
    />
  )
}
