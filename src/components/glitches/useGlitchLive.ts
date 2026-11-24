/**
 * @file Hook: refresh route data (debounced router.invalidate) on glitch/echo live events and
 * expose the set of glitch ids that just changed so rows can flash.
 * @exports useGlitchLive
 * @usedBy src/routes/index.tsx, src/routes/glitches.$glitchId.tsx
 */
import { useCallback, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useLiveEvents } from '#/lib/useLiveEvents.ts'

export function useGlitchLive(): ReadonlySet<string> {
  const router = useRouter()
  const [flash, setFlash] = useState<ReadonlySet<string>>(new Set())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const mark = useCallback((id: string | null | undefined) => {
    if (!id) return
    setFlash((s) => new Set(s).add(id))
    setTimeout(() => {
      setFlash((s) => {
        const n = new Set(s)
        n.delete(id)
        return n
      })
    }, 2500)
  }, [])

  useLiveEvents((e) => {
    if (e.type === 'glitch.created' || e.type === 'glitch.updated') mark(e.glitch.glitchId)
    else if (e.type === 'echo.created' || e.type === 'echo.rejected') mark(e.echo.glitchId)
    else return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void router.invalidate(), 250)
  })
  return flash
}
