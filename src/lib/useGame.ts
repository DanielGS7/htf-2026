/**
 * @file Client hook for the "Desync Protocol" game (F33): public game state plus the caller's private view,
 * kept fresh through live events. Loads on mount; `game.state` events replace `state` and trigger a refetch
 * of the private view; `resync` / `game.discovered` refetch both. Server-fn failures (signed out, engine
 * not ready) leave the last known value, so the idle UI never breaks.
 * @exports useGame, UseGame
 * @usedBy src/routes/report.tsx, src/components/game/**
 * @example const { state, view, refresh } = useGame()  // state.phase, view?.role, await refresh()
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { IDLE_GAME_STATE, type MyGameView, type PublicGameState } from '#/lib/game.ts'
import { getGameState, getMyGameView } from '#/lib/game.functions.ts'
import { useLiveEvents } from '#/lib/useLiveEvents.ts'

export type UseGame = {
  /** Public state; `phase === 'idle'` until a game exists. */
  state: PublicGameState
  /** Private view; null until loaded, when signed out, or while idle. */
  view: MyGameView | null
  /** Refetch both now (e.g. after your own vote or sabotage). */
  refresh: () => Promise<void>
  /** true once the first load finished (success or not). */
  ready: boolean
}

export function useGame(): UseGame {
  const [state, setState] = useState<PublicGameState>(IDLE_GAME_STATE)
  const [view, setView] = useState<MyGameView | null>(null)
  const [ready, setReady] = useState(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const loadView = useCallback(async () => {
    try {
      const v = await getMyGameView()
      if (alive.current) setView(v)
    } catch {
      /* signed out or engine not ready: keep the last view */
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const s = await getGameState()
      if (alive.current) setState(s)
      if (s.phase === 'idle') {
        if (alive.current) setView(null)
        return
      }
    } catch {
      /* keep last state */
    }
    await loadView()
  }, [loadView])

  useEffect(() => {
    void refresh().finally(() => alive.current && setReady(true))
  }, [refresh])

  useLiveEvents((e) => {
    if (e.type === 'game.state') {
      setState(e.state)
      if (e.state.phase === 'idle') setView(null)
      else void loadView()
    } else if (e.type === 'game.discovered' || e.type === 'resync') {
      void refresh()
    }
  })

  return { state, view, refresh, ready }
}
