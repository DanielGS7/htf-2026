/**
 * @file Input and Select primitives with optional label + hint.
 * @exports Input, Select
 */
import { useId, type ComponentProps } from 'react'

const FIELD =
  'h-11 w-full rounded-xl border border-line bg-subtle px-3 text-fg placeholder:text-muted/70 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30'

function Wrap({ id, label, hint, children }: { id: string; label?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
      )}
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function Input({
  label,
  hint,
  className = '',
  ...props
}: ComponentProps<'input'> & { label?: string; hint?: string }) {
  const id = useId()
  return (
    <Wrap id={id} label={label} hint={hint}>
      <input id={id} className={`${FIELD} ${className}`} {...props} />
    </Wrap>
  )
}

export function Select({
  label,
  hint,
  className = '',
  ...props
}: ComponentProps<'select'> & { label?: string; hint?: string }) {
  const id = useId()
  return (
    <Wrap id={id} label={label} hint={hint}>
      <select id={id} className={`${FIELD} ${className}`} {...props} />
    </Wrap>
  )
}
