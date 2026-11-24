/**
 * @file Client hook: subscribe to the live SSE stream (/api/events).
 * One shared EventSource per tab; auto-reconnects (browser default).
 * @exports useLiveEvents(handler), useConnectionStatus(), LiveEvent (re-exported type)
 * @usedBy any component that must update in real time
 * @example useLiveEvents((e) => { if (e.type === 'glitch.created') router.invalidate() })
 */
import { useEffect, useRef, useState } from 'react'
import type { LiveEvent } from '#/server/bus.ts'

export type { LiveEvent }

type Handler = (e: LiveEvent) => void
const handlers = new Set<Handler>()
const statusListeners = new Set<(online: boolean) => void>()
let source: EventSource | null = null
let online = false

function setOnline(v: boolean) {
  online = v
  for (const l of statusListeners) l(v)
}

function ensureSource() {
  if (source || typeof window === 'undefined') return
  source = new EventSource('/api/events')
  source.onopen = () => setOnline(true)
  source.onerror = () => setOnline(false)
  source.onmessage = (msg) => {
    let event: LiveEvent
    try {
      event = JSON.parse(msg.data)
    } catch {
      return
    }
    for (const h of handlers) h(event)
  }
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

/** true while the SSE stream is connected (drives the offline indicator). */
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
