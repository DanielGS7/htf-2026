/**
 * @file Client hook: subscribe to live events from the server.
 * Transport: Server-Sent Events (/api/events) first. If the stream doesn't deliver its `hello` event
 * within 4s, or goes silent for 25s (no `ping`), it falls back to long-polling (/api/events/poll),
 * which works through proxies that buffer SSE (e.g. Cloudflare quick tunnels). Events carry a sequence
 * number, so switching transports never loses or repeats events; a gap triggers a `resync` event.
 * ONE connection per browser, not per tab: the tab holding the `gg-live-leader` Web Lock runs the
 * transport and relays events + status to other tabs over BroadcastChannel (keeps us under the
 * 6-connections-per-host limit). Falls back to one transport per tab without Web Locks.
 * @exports useLiveEvents(handler), useConnectionStatus(), LiveEvent (re-exported type)
 * @usedBy any component that must update in real time
 * @example useLiveEvents((e) => { if (e.type === 'glitch.created') router.invalidate() })
 */
import { useEffect, useRef, useState } from 'react'
import type { LiveEvent } from '#/server/bus.ts'

export type { LiveEvent }

type Handler = (e: LiveEvent) => void
type RelayMessage = { kind: 'event'; event: LiveEvent } | { kind: 'status'; online: boolean } | { kind: 'hello' }

const HELLO_TIMEOUT_MS = 4_000
const SILENCE_TIMEOUT_MS = 25_000

const handlers = new Set<Handler>()
const statusListeners = new Set<(online: boolean) => void>()
let started = false
let isLeader = false
let channel: BroadcastChannel | null = null
let online = false
/** Highest event sequence number seen; -1 = not synced yet. */
let lastSeq = -1

function setOnline(v: boolean) {
  if (online === v) return
  online = v
  for (const l of statusListeners) l(v)
  relay({ kind: 'status', online: v })
}

function dispatch(event: LiveEvent) {
  for (const h of handlers) h(event)
}

function relay(msg: RelayMessage) {
  if (isLeader) channel?.postMessage(msg)
}

/** Deliver an event once, in order (SSE and polling may overlap briefly when switching). */
function deliver(seq: number, event: LiveEvent) {
  if (seq <= lastSeq) return
  lastSeq = seq
  dispatch(event)
  relay({ kind: 'event', event })
}

// ---------------------------------------------------------------- SSE transport
function startSse() {
  const source = new EventSource('/api/events')
  let healthy = false
  let silence: ReturnType<typeof setTimeout>
  const giveUp = () => {
    source.close()
    clearTimeout(silence)
    console.info('[live] SSE not delivering, switching to long-polling')
    void startPolling()
  }
  const helloTimer = setTimeout(() => {
    if (!healthy) giveUp()
  }, HELLO_TIMEOUT_MS)
  const resetSilence = () => {
    clearTimeout(silence)
    silence = setTimeout(giveUp, SILENCE_TIMEOUT_MS)
  }

  source.addEventListener('hello', (m) => {
    healthy = true
    clearTimeout(helloTimer)
    const seq = Number((m as MessageEvent).data)
    if (lastSeq < 0) lastSeq = seq
    else if (seq > lastSeq) {
      // Reconnected after missing events: let pages refetch.
      lastSeq = seq
      dispatch({ type: 'resync' })
      relay({ kind: 'event', event: { type: 'resync' } })
    }
    setOnline(true)
    resetSilence()
  })
  source.addEventListener('ping', () => {
    setOnline(true)
    resetSilence()
  })
  source.onmessage = (msg) => {
    resetSilence()
    let event: LiveEvent
    try {
      event = JSON.parse(msg.data)
    } catch {
      return
    }
    deliver(Number(msg.lastEventId) || lastSeq + 1, event)
  }
  source.onerror = () => {
    // The browser retries SSE by itself; only the status changes here.
    setOnline(false)
  }
}

// ---------------------------------------------------------------- long-poll transport
async function startPolling() {
  let failures = 0
  for (;;) {
    try {
      const res = await fetch(`/api/events/poll?since=${lastSeq}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as { latest: number; events: { seq: number; event: LiveEvent }[]; gap: boolean }
      failures = 0
      setOnline(true)
      if (body.gap) {
        lastSeq = body.latest
        dispatch({ type: 'resync' })
        relay({ kind: 'event', event: { type: 'resync' } })
        continue
      }
      if (lastSeq < 0) lastSeq = body.latest
      for (const e of body.events) deliver(e.seq, e.event)
    } catch {
      failures++
      setOnline(false)
      await new Promise((r) => setTimeout(r, Math.min(10_000, 1000 * failures)))
    }
  }
}

function startTransport() {
  if (typeof EventSource === 'undefined') void startPolling()
  else startSse()
}

function ensureStarted() {
  if (started || typeof window === 'undefined') return
  started = true
  const canShare = typeof BroadcastChannel !== 'undefined' && typeof navigator !== 'undefined' && 'locks' in navigator
  if (!canShare) {
    isLeader = true
    startTransport()
    return
  }
  channel = new BroadcastChannel('gg-live')
  channel.onmessage = (m: MessageEvent<RelayMessage>) => {
    const d = m.data
    if (d.kind === 'event') dispatch(d.event)
    else if (d.kind === 'status') {
      online = d.online
      for (const l of statusListeners) l(d.online)
    } else if (d.kind === 'hello' && isLeader) channel?.postMessage({ kind: 'status', online } satisfies RelayMessage)
  }
  // The lock is held for the tab's lifetime (the promise never resolves); the browser releases it on close.
  void navigator.locks.request('gg-live-leader', () => {
    isLeader = true
    startTransport()
    return new Promise<never>(() => {})
  })
  // Followers ask the current leader for its connection status.
  channel.postMessage({ kind: 'hello' } satisfies RelayMessage)
}

export function useLiveEvents(handler: Handler): void {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const h: Handler = (e) => ref.current(e)
    handlers.add(h)
    ensureStarted()
    return () => {
      handlers.delete(h)
    }
  }, [])
}

/** true while the live stream is connected (drives the offline indicator). */
export function useConnectionStatus(): boolean {
  const [state, setState] = useState(online)
  useEffect(() => {
    ensureStarted()
    statusListeners.add(setState)
    setState(online)
    return () => {
      statusListeners.delete(setState)
    }
  }, [])
  return state
}
