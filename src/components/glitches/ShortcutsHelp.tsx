/**
 * @file Modal listing keyboard shortcuts (key `?`).
 * @exports ShortcutsHelp
 * @usedBy src/routes/index.tsx, src/routes/glitches.$glitchId.tsx
 */
import { useEffect } from 'react'
import { SHORTCUT_HELP } from '#/lib/useShortcuts.ts'

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="presentation">
      <div role="dialog" aria-label="Keyboard shortcuts" className="w-full max-w-sm rounded-2xl border border-line bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-semibold text-fg">Keyboard shortcuts</h2>
        <ul className="space-y-2 text-sm">
          {SHORTCUT_HELP.map((s) => (
            <li key={s.keys} className="flex items-center justify-between">
              <span className="text-muted">{s.label}</span>
              <kbd className="rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-xs text-fg">{s.keys}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
