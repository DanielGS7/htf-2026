/**
 * @file In-process pub/sub that feeds the live transports. SERVER-ONLY.
 * Call `publish()` after every DB mutation that clients should see live.
 * Every event gets a sequence number and is kept in a ring buffer, so the long-poll fallback
 * (/api/events/poll, used when a proxy such as a Cloudflare quick tunnel buffers SSE) can resume.
 * @exports publish, subscribe, eventsSince, latestSeq, LiveEvent (type), SequencedEvent (type)
 * @usedBy src/server/*, src/lib/*.functions.ts handlers, src/routes/api/events.ts, src/routes/api/events.poll.ts
 */
import type { Echo, Glitch, SensorReading } from '#/lib/glitch.ts'
import type { PublicGameState } from '#/lib/game.ts'

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
  /** Game mode (F33): public game state changed. Never carries secret roles while playing. */
  | { type: 'game.state'; state: PublicGameState }
  /** Game mode: a hidden sabotage was just discovered by a report (projector "DISCOVERED" moment). */
  | { type: 'game.discovered'; glitch: Glitch; byCodename: string | null }
  /** Client-side only: events were missed (long-poll gap); refetch page data. Never published. */
  | { type: 'resync' }

export type SequencedEvent = { seq: number; event: LiveEvent }

type Listener = (e: LiveEvent, seq: number) => void

const BUFFER_SIZE = 1000

// globalThis keeps one bus across Vite HMR reloads of this module.
const g = globalThis as unknown as { __ggBus?: { listeners: Set<Listener>; buffer: SequencedEvent[]; seq: number } }
const bus = (g.__ggBus ??= { listeners: new Set<Listener>(), buffer: [], seq: 0 })

export function publish(event: LiveEvent): void {
  const seq = ++bus.seq
  bus.buffer.push({ seq, event })
  if (bus.buffer.length > BUFFER_SIZE) bus.buffer.splice(0, bus.buffer.length - BUFFER_SIZE)
  for (const l of bus.listeners) {
    try {
      l(event, seq)
    } catch (err) {
      console.error('[bus] listener failed', err)
    }
  }
}

/** Returns an unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  bus.listeners.add(listener)
  return () => bus.listeners.delete(listener)
}

export function latestSeq(): number {
  return bus.seq
}

/**
 * Events after `since`. `gap` is true when some were already dropped from the ring buffer
 * (the client should then refetch its page data instead of trusting the delta).
 */
export function eventsSince(since: number): { events: SequencedEvent[]; gap: boolean } {
  const events = bus.buffer.filter((e) => e.seq > since)
  const oldest = bus.buffer[0]?.seq ?? bus.seq + 1
  return { events, gap: since < oldest - 1 && since < bus.seq }
}
