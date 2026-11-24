/**
 * @file In-process pub/sub that feeds the SSE stream (src/routes/api/events.ts).
 * SERVER-ONLY. Call `publish()` after every DB mutation that clients should see live.
 * @exports publish, subscribe, LiveEvent (type)
 * @usedBy src/server/*, src/lib/*.functions.ts handlers, src/routes/api/events.ts
 */
import type { Echo, Glitch, SensorReading } from '#/lib/glitch.ts'

/** Every event pushed to browsers. Add new variants here (client reads the same type). */
export type LiveEvent =
  | { type: 'glitch.created'; glitch: Glitch }
  | { type: 'glitch.updated'; glitch: Glitch }
  | { type: 'echo.created'; echo: Echo }
  | { type: 'echo.rejected'; echo: Echo }
  | { type: 'sensor.reading'; reading: SensorReading }
  /** Overall magic level 0-100 (average of districts, minus open glitch penalty). */
  | { type: 'magic.level'; level: number }
  | { type: 'lockdown'; active: boolean; reason: string | null }
  | { type: 'toast'; tone: 'info' | 'warning' | 'danger' | 'success'; message: string }

type Listener = (e: LiveEvent) => void

// globalThis keeps one bus across Vite HMR reloads of this module.
const g = globalThis as unknown as { __ggBus?: Set<Listener> }
const listeners = (g.__ggBus ??= new Set<Listener>())

export function publish(event: LiveEvent): void {
  for (const l of listeners) {
    try {
      l(event)
    } catch (err) {
      console.error('[bus] listener failed', err)
    }
  }
}

/** Returns an unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
