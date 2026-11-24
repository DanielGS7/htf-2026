/**
 * @file Mission Control's voice: browser speechSynthesis (English voice, slightly slow) announces the
 * key game moments: round started, sabotage discovered, meeting called, ejection result, critical
 * magic (once per drop below 40) and the winner. Mute choice persists in localStorage. Browsers need a
 * user gesture first, so `needsEnable` drives a small "Enable voice" button (any click/key also enables it).
 * The first state seen is the baseline: loading the page mid-game never replays old moments.
 * @exports useAnnouncer
 * @usedBy src/routes/mission.tsx
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PublicGameState } from '#/lib/game.ts'
import type { Discovery } from './useGameLive.ts'

const KEY = 'gg-mission-voice-muted'

function readMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => /^en-(GB|US)/i.test(v.lang)) ?? voices.find((v) => /^en/i.test(v.lang)) ?? null
}

export function useAnnouncer(state: PublicGameState, discovery: Discovery | null, magic: number) {
  const [supported, setSupported] = useState(false)
  const [muted, setMuted] = useState(false)
  const [activated, setActivated] = useState(false)
  const mutedRef = useRef(false)
  const activatedRef = useRef(false)

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
    const m = readMuted()
    setMuted(m)
    mutedRef.current = m
    const on = () => {
      activatedRef.current = true
      setActivated(true)
    }
    window.addEventListener('pointerdown', on, { once: true })
    window.addEventListener('keydown', on, { once: true })
    return () => {
      window.removeEventListener('pointerdown', on)
      window.removeEventListener('keydown', on)
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (mutedRef.current || !activatedRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.9
    u.pitch = 0.9
    const v = pickVoice()
    if (v) {
      u.voice = v
      u.lang = v.lang
    } else u.lang = 'en-GB'
    window.speechSynthesis.speak(u)
  }, [])

  const toggleMuted = useCallback(() => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    try {
      localStorage.setItem(KEY, next ? '1' : '0')
    } catch {
      /* private mode: choice just isn't remembered */
    }
    if (next && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  const enable = useCallback(() => {
    activatedRef.current = true
    setActivated(true)
    speak('Voice enabled.')
  }, [speak])

  // ---- moments
  const prev = useRef<{
    phase: string
    meeting: boolean
    result: boolean
    low: boolean
  } | null>(null)
  useEffect(() => {
    const cur = {
      phase: state.phase,
      meeting: !!state.meeting,
      result: !!state.meeting?.result,
      low: magic < 40,
    }
    const p = prev.current
    prev.current = cur
    if (!p) return
    const inGame = state.phase === 'playing' || state.phase === 'meeting'
    if (state.phase === 'playing' && (p.phase === 'lobby' || p.phase === 'idle')) speak('Round started. Defend Achrona.')
    if (state.meeting && !p.meeting) speak(`Emergency meeting called by ${state.meeting.calledByCodename}.`)
    if (state.meeting?.result && !p.result) {
      const r = state.meeting.result
      if (!r.ejectedCodename) speak('The vote is split. Nobody is ejected.')
      else speak(r.wasDesync ? `${r.ejectedCodename} was the Desync.` : `${r.ejectedCodename} was not the Desync.`)
    }
    if (inGame && cur.low && !p.low) speak(`Warning. Magic level critical, ${Math.round(magic)} percent.`)
    if (state.phase === 'ended' && p.phase !== 'ended') {
      speak(
        state.winner === 'defenders'
          ? 'Achrona holds. The defenders win.'
          : `The Desync wins.${state.desyncCodename ? ` It was ${state.desyncCodename}.` : ''}`,
      )
    }
  }, [state, magic, speak])

  const lastDiscovery = useRef(0)
  useEffect(() => {
    if (!discovery || discovery.seq === lastDiscovery.current) return
    lastDiscovery.current = discovery.seq
    speak(`Sabotage discovered in ${discovery.district}.${discovery.byCodename ? ` Reported by ${discovery.byCodename}.` : ''}`)
  }, [discovery, speak])

  return {
    supported,
    muted,
    toggleMuted,
    needsEnable: supported && !muted && !activated,
    enable,
  }
}
