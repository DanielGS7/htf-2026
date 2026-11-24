/**
 * @file Modal listing keyboard shortcuts (key `?`). Uses the shared Modal primitive (Escape / backdrop close).
 * @exports ShortcutsHelp
 * @usedBy src/routes/index.tsx, src/routes/glitches.$glitchId.tsx
 */
import { Modal } from '#/components/ui/Modal.tsx'
import { SHORTCUT_HELP } from '#/lib/useShortcuts.ts'

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <ul className="divide-y divide-line">
        {SHORTCUT_HELP.map((s) => (
          <li key={s.keys} className="flex items-center justify-between py-2">
            <span className="text-fg">{s.label}</span>
            <kbd className="rounded-sm border border-line bg-subtle px-2 py-0.5 font-mono text-xs text-fg">{s.keys}</kbd>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
