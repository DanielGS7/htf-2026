/**
 * @file Button primitive. Variants: primary (glowing accent gradient), secondary, ghost, danger.
 * @exports Button
 */
import type { ComponentProps } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-linear-to-br from-accent-from to-accent-to text-on-accent shadow-[0_0_24px_-4px_var(--glow)] hover:brightness-110',
  secondary: 'border border-line bg-subtle text-fg hover:bg-subtle-hover',
  ghost: 'text-muted hover:bg-subtle hover:text-fg',
  danger: 'bg-danger text-white hover:brightness-110',
}
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  )
}
