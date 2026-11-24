/**
 * @file Offline queue for echoes (F16). Stores unsent echoes in localStorage (all access in try/catch)
 * and auto-flushes when the live stream reconnects, the browser comes online, or every 15s while queued.
 * @exports useEchoQueue, isNetworkError, QueuedEcho (type)
 * @usedBy src/components/field/EchoComposer.tsx
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createEchoField, type FieldResult } from '#/lib/field.functions.ts'
import { useConnectionStatus } from '#/lib/useLiveEvents.ts'

export type QueuedEcho = { id: string; description: string; districtId: string | null; imageUrl: string | null; at: number }

const KEY = 'gg.echoQueue'

function read(): QueuedEcho[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function write(list: QueuedEcho[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

/** True for connectivity failures (worth queueing), false for validation / auth / server errors. */
export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = e instanceof Error ? e.message : String(e)
  return e instanceof TypeError || /failed to fetch|networkerror|network request|load failed|fetch failed|ECONNREFUSED/i.test(msg)
}

const isAuthError = (e: unknown) => /not logged in/i.test(e instanceof Error ? e.message : String(e))

export function useEchoQueue(handlers: { onSent: (r: FieldResult, q: QueuedEcho) => void; onDropped: (q: QueuedEcho, reason: string) => void }) {
  const online = useConnectionStatus()
  const [queue, setQueue] = useState<QueuedEcho[]>([])
  const flushing = useRef(false)
  const h = useRef(handlers)
  h.current = handlers

  useEffect(() => setQueue(read()), [])

  const enqueue = useCallback((e: Omit<QueuedEcho, 'id' | 'at'>) => {
    const item: QueuedEcho = { ...e, id: `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: Date.now() }
    let list = [...read(), item]
    // A big photo may blow the localStorage quota: keep the text, drop the photo.
    if (!write(list)) {
      list = [...read(), { ...item, imageUrl: null }]
      write(list)
    }
    setQueue(list)
  }, [])

  const flush = useCallback(async () => {
    if (flushing.current) return
    flushing.current = true
    try {
      let list = read()
      while (list.length) {
        const item = list[0]
        try {
          const r = await createEchoField({ data: { description: item.description, districtId: item.districtId, imageUrl: item.imageUrl } })
          h.current.onSent(r, item)
        } catch (e) {
          if (isNetworkError(e) || isAuthError(e)) break
          h.current.onDropped(item, e instanceof Error ? e.message : 'Rejected by the server')
        }
        list = list.slice(1)
        write(list)
        setQueue(list)
      }
    } finally {
      flushing.current = false
    }
  }, [])

  useEffect(() => {
    if (online && queue.length) void flush()
  }, [online, queue.length, flush])

  useEffect(() => {
    const on = () => void flush()
    window.addEventListener('online', on)
    const t = setInterval(() => {
      if (read().length) void flush()
    }, 15_000)
    return () => {
      window.removeEventListener('online', on)
      clearInterval(t)
    }
  }, [flush])

  return { queue, enqueue, flush }
}
