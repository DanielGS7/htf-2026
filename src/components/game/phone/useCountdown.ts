/**
 * @file Countdown hook for the game UI: seconds left until an ISO time (ticks 4x/s, clamps at 0).
 * @exports useCountdown, fmtClock
 * @usedBy src/components/game/phone/*
 */
import { useEffect, useState } from 'react'

export function useCountdown(iso: string | null): number {
  const target = iso ? Date.parse(iso) : null
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (target == null) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [target])
  return target == null ? 0 : Math.max(0, Math.ceil((target - now) / 1000))
}

/** 125 -> "2:05" */
export function fmtClock(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
