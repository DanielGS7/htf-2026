/**
 * @file Button primitive in the HTF look: chunky plates, uppercase Saira, a darker bottom edge instead
 * of a glow. Variants: primary (blue plate), secondary (outlined), ghost, danger (orange-red plate).
 * @exports Button
 */
import type { ComponentProps } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[linear-gradient(180deg,var(--accent-from),var(--accent)_70%,var(--accent-to))] text-on-accent shadow-[inset_0_-3px_0_rgb(0_0_0/0.28)] hover:brightness-110 active:translate-y-px active:shadow-none',
  secondary: 'border border-line bg-subtle text-fg hover:border-accent/60 hover:bg-subtle-hover',
  ghost: 'text-muted hover:bg-subtle hover:text-fg',
  danger:
    'bg-[linear-gradient(180deg,#f48d30,#eb4c2d_70%,#d2341b)] text-white shadow-[inset_0_-3px_0_rgb(0_0_0/0.28)] hover:brightness-110 active:translate-y-px active:shadow-none',
}
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
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
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold tracking-wide uppercase transition [font-stretch:92%] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  )
}
