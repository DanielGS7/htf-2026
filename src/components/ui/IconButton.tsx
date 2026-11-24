/**
 * @file Icon-only button UI primitive. Always pass `label`: it becomes the tooltip and aria-label.
 * @exports IconButton
 */
import type { ComponentProps } from 'react'

export function IconButton({
  className = '',
  label,
  ...props
}: ComponentProps<'button'> & { label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-md text-muted transition-colors hover:bg-subtle hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${className}`}
      {...props}
    />
  )
}
