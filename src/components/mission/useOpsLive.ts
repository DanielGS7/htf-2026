/**
 * @file Hook that keeps an `OpsSnapshot` live: applies sensor/magic/echo/glitch/lockdown events as
 * they arrive and re-syncs from the server every few seconds (self-heals after resets or drops).
 * Also `useMagicLevel` (just the overall level) and `useDistrictMagic` (latest value per district),
 * used by the self-subscribing MagicGauge and AchronaMap.
 * @exports useOpsLive, useMagicLevel, useDistrictMagic
 * @usedBy src/routes/mission.tsx, src/routes/admin.tsx, src/components/mission/MagicGauge.tsx, src/components/map/AchronaMap.tsx
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getOpsSnapshot, type OpsSnapshot } from '#/lib/ops.functions.ts'
import { DISTRICTS, type DistrictId, type Glitch, type SensorReading } from '#/lib/glitch.ts'
import { useLiveEvents } from '#/lib/useLiveEvents.ts'

const HISTORY = 40
const FEED = 40

export function useOpsLive(initial: OpsSnapshot, resyncMs = 5000): OpsSnapshot & { refresh: () => void } {
  const [snap, setSnap] = useState(initial)
  const busy = useRef(false)

  const refresh = useCallback(() => {
    if (busy.current) return
    busy.current = true
    getOpsSnapshot()
      .then(setSnap)
      .catch(() => {})
      .finally(() => {
        busy.current = false
      })
  }, [])

  useEffect(() => {
    const t = setInterval(refresh, resyncMs)
    return () => clearInterval(t)
  }, [refresh, resyncMs])

  useLiveEvents((e) => {
    switch (e.type) {
      case 'magic.level':
        setSnap((s) => ({ ...s, magic: e.level }))
        break
      case 'sensor.reading': {
        const r = e.reading
        setSnap((s) => ({
          ...s,
          latest: s.latest.map((l) => (l.districtId === r.districtId ? r : l)),
          history: { ...s.history, [r.districtId]: [...(s.history[r.districtId] ?? []), r.magic].slice(-HISTORY) },
        }))
        break
      }
      case 'echo.created':
      case 'echo.rejected':
        setSnap((s) => ({ ...s, echoes: [{ ...e.echo, imageUrl: null }, ...s.echoes.filter((x) => x.echoId !== e.echo.echoId)].slice(0, FEED) }))
        break
      case 'glitch.created':
      case 'glitch.updated': {
        const gl: Glitch = e.glitch
        setSnap((s) => {
          const rest = s.glitches.filter((x) => x.glitchId !== gl.glitchId)
          return { ...s, glitches: gl.status === 'FIXED' ? rest : [gl, ...rest] }
        })
        refresh()
        break
      }
      case 'lockdown':
        setSnap((s) => ({ ...s, lockdown: { active: e.active, reason: e.reason } }))
        break
    }
  })
  return { ...snap, refresh }
}

/** Overall magic level, or null until known. `initial` skips the fetch. */
export function useMagicLevel(initial?: number): number | null {
  const [level, setLevel] = useState<number | null>(initial ?? null)
  useEffect(() => {
    if (initial !== undefined) return
    let alive = true
    getOpsSnapshot()
      .then((s) => alive && setLevel((l) => l ?? s.magic))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [initial])
  useLiveEvents((e) => {
    if (e.type === 'magic.level' && initial === undefined) setLevel(e.level)
  })
  return initial !== undefined ? initial : level
}

/** Latest magic per district (defaults to 96 until the first snapshot/reading arrives). Pass `initial` to control it from outside. */
export function useDistrictMagic(initial?: SensorReading[]): Record<DistrictId, number> {
  const [m, setM] = useState<Record<string, number>>(() =>
    Object.fromEntries(DISTRICTS.map((d) => [d.id, initial?.find((r) => r.districtId === d.id)?.magic ?? 96])),
  )
  useEffect(() => {
    if (initial) return
    let alive = true
    getOpsSnapshot()
      .then((s) => alive && setM(Object.fromEntries(s.latest.map((r) => [r.districtId, r.magic]))))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [initial])
  useLiveEvents((e) => {
    if (e.type === 'sensor.reading') setM((prev) => ({ ...prev, [e.reading.districtId]: e.reading.magic }))
  })
  if (initial) {
    // Controlled: the parent already tracks the readings.
    return Object.fromEntries(DISTRICTS.map((d) => [d.id, initial.find((r) => r.districtId === d.id)?.magic ?? 96])) as Record<DistrictId, number>
  }
  return m as Record<DistrictId, number>
}
