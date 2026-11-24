/**
 * @file Client hook: subscribe to the live SSE stream (/api/events).
 * ONE EventSource per browser, not per tab: the tab holding the `gg-live-leader` Web Lock opens
 * the stream and relays events + connection status to other tabs over BroadcastChannel; when it
 * closes, another tab takes over. This keeps us under the browser's 6-connections-per-host limit
 * (HTTP/1.1), which several open tabs (mission + admin + overview) would otherwise exhaust.
 * Falls back to one EventSource per tab when Web Locks/BroadcastChannel are unavailable.
 * @exports useLiveEvents(handler), useConnectionStatus(), LiveEvent (re-exported type)
 * @usedBy any component that must update in real time
 * @example useLiveEvents((e) => { if (e.type === 'glitch.created') router.invalidate() })
 */
import { useEffect, useRef, useState } from 'react'
import type { LiveEvent } from '#/server/bus.ts'

export type { LiveEvent }

type Handler = (e: LiveEvent) => void
type RelayMessage = { kind: 'event'; event: LiveEvent } | { kind: 'status'; online: boolean } | { kind: 'hello' }

const handlers = new Set<Handler>()
const statusListeners = new Set<(online: boolean) => void>()
let started = false
let isLeader = false
let source: EventSource | null = null
let channel: BroadcastChannel | null = null
let online = false

function setOnline(v: boolean) {
  online = v
  for (const l of statusListeners) l(v)
}

function dispatch(event: LiveEvent) {
  for (const h of handlers) h(event)
}

function relay(msg: RelayMessage) {
  if (isLeader) channel?.postMessage(msg)
}

function openSource() {
  source = new EventSource('/api/events')
  source.onopen = () => {
    setOnline(true)
    relay({ kind: 'status', online: true })
  }
  source.onerror = () => {
    setOnline(false)
    relay({ kind: 'status', online: false })
  }
  source.onmessage = (msg) => {
    let event: LiveEvent
    try {
      event = JSON.parse(msg.data)
    } catch {
      return
    }
    dispatch(event)
    relay({ kind: 'event', event })
  }
}

function ensureSource() {
  if (started || typeof window === 'undefined') return
  started = true
  const canShare = typeof BroadcastChannel !== 'undefined' && typeof navigator !== 'undefined' && 'locks' in navigator
  if (!canShare) {
    openSource()
    return
  }
  channel = new BroadcastChannel('gg-live')
  channel.onmessage = (m: MessageEvent<RelayMessage>) => {
    const d = m.data
    if (d.kind === 'event') dispatch(d.event)
    else if (d.kind === 'status') setOnline(d.online)
    else if (d.kind === 'hello' && isLeader) channel?.postMessage({ kind: 'status', online } satisfies RelayMessage)
  }
  // The lock is held for the tab's lifetime (the promise never resolves); the browser releases it on close.
  void navigator.locks.request('gg-live-leader', () => {
    isLeader = true
    openSource()
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
    ensureSource()
    return () => {
      handlers.delete(h)
    }
  }, [])
}

/** true while the live stream is connected (drives the offline indicator). */
export function useConnectionStatus(): boolean {
  const [state, setState] = useState(online)
  useEffect(() => {
    ensureSource()
    statusListeners.add(setState)
    setState(online)
    return () => {
      statusListeners.delete(setState)
    }
  }, [])
  return state
}
