/**
 * @file Modal dialog primitive: HUD panel on a dark scrim (no blur), Escape / click outside to close.
 * @exports Modal
 */
import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './IconButton.tsx'

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className="glass hud float-in w-full max-w-lg rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <h2 className="text-lg font-semibold tracking-wide uppercase">{title}</h2>
          <IconButton label="Close" onClick={onClose} className="size-8">
            <X className="size-5" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}
