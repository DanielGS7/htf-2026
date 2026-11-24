/**
 * @file Live game state for the projector and the admin lobby panel: starts from `initial`, applies
 * `game.state` events, re-syncs via getGameState every few seconds. Also tracks the latest
 * `game.discovered` moment (auto-clears after 3.2s) and a ticking `now` for countdowns.
 * @exports useGameLive, useNow, formatClock, districtName
 * @usedBy src/routes/mission.tsx, src/components/game/admin/GameLobbyPanel.tsx
 */
import { useEffect, useRef, useState } from 'react'
import { getGameState } from '#/lib/game.functions.ts'
import { IDLE_GAME_STATE, type PublicGameState } from '#/lib/game.ts'
import { DISTRICTS } from '#/lib/glitch.ts'
import { useLiveEvents } from '#/lib/useLiveEvents.ts'

export type Discovery = {
  seq: number
  district: string
  byCodename: string | null
}

export function districtName(id: string | null | undefined): string {
  return DISTRICTS.find((d) => d.id === id)?.name ?? 'an unknown district'
}

export function useGameLive(initial: PublicGameState = IDLE_GAME_STATE, resyncMs = 4000) {
  const [state, setState] = useState(initial)
  const [discovery, setDiscovery] = useState<Discovery | null>(null)
  const seq = useRef(0)
  const clear = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    let alive = true
    const pull = () =>
      getGameState()
        .then((s) => alive && s && setState(s))
        .catch(() => {})
    pull()
    const t = setInterval(pull, resyncMs)
    return () => {
      alive = false
      clearInterval(t)
      clearTimeout(clear.current)
    }
  }, [resyncMs])

  useLiveEvents((e) => {
    if (e.type === 'game.state') setState(e.state)
    else if (e.type === 'game.discovered') {
      seq.current += 1
      setDiscovery({
        seq: seq.current,
        district: districtName(e.glitch.districtId),
        byCodename: e.byCodename,
      })
      clearTimeout(clear.current)
      clear.current = setTimeout(() => setDiscovery(null), 3200)
    }
  })
  return { state, discovery }
}

/** Current time in ms, refreshed every `ms` (for countdowns). */
export function useNow(ms = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/** m:ss from a remaining-ms value (never negative). */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
