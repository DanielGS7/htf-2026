/**
 * @file Keyboard shortcut hook. Ignores keys while typing in inputs/textareas/selects or with modifiers.
 * Supports single keys ('j', '?') and two-key sequences ('g m').
 * @exports useShortcuts, SHORTCUT_HELP
 * @usedBy src/routes/index.tsx, src/routes/glitches.$glitchId.tsx
 */
import { useEffect, useRef } from 'react'

export type ShortcutMap = Record<string, (e: KeyboardEvent) => void>

export const SHORTCUT_HELP: { keys: string; label: string }[] = [
  { keys: 'j / k', label: 'Next / previous glitch' },
  { keys: 'Enter', label: 'Open selected glitch' },
  { keys: 'n', label: 'Report a new echo' },
  { keys: '/', label: 'Focus search' },
  { keys: 'g m', label: 'Go to mission control' },
  { keys: 'g o', label: 'Go to overview' },
  { keys: '?', label: 'Show this help' },
  { keys: 'Esc', label: 'Close dialogs' },
]

export function useShortcuts(map: ShortcutMap, enabled = true) {
  const ref = useRef(map)
  ref.current = map
  useEffect(() => {
    if (!enabled) return
    let pending: string | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      if (pending) {
        const combo = `${pending} ${e.key}`
        pending = null
        clearTimeout(timer)
        const h = ref.current[combo]
        if (h) {
          e.preventDefault()
          h(e)
          return
        }
      }
      if (e.key === 'g') {
        pending = 'g'
        timer = setTimeout(() => (pending = null), 900)
        return
      }
      const h = ref.current[e.key]
      if (h) {
        e.preventDefault()
        h(e)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(timer)
    }
  }, [enabled])
}
