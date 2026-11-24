/**
 * @file GET /api/events — Server-Sent Events stream of LiveEvent JSON (one per `data:` line).
 * Sends `event: hello` immediately and `event: ping` every 10s as REAL events (not comments), so
 * the client can tell a working stream from one a proxy is silently buffering, and fall back to
 * long-polling (/api/events/poll). Each message carries `id: <seq>`.
 * @usedBy src/lib/useLiveEvents.ts (EventSource)
 */
import { createFileRoute } from '@tanstack/react-router'
import { latestSeq, subscribe } from '#/server/bus.ts'

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const encoder = new TextEncoder()
        let cleanup = () => {}
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (chunk: string) => {
              try {
                controller.enqueue(encoder.encode(chunk))
              } catch {
                cleanup()
              }
            }
            // ~2KB of padding defeats proxies that buffer until they've seen "enough" bytes.
            send(`: ${' '.repeat(2048)}\n\n`)
            send(`event: hello\ndata: ${latestSeq()}\n\n`)
            const unsubscribe = subscribe((event, seq) => send(`id: ${seq}\ndata: ${JSON.stringify(event)}\n\n`))
            const heartbeat = setInterval(() => send(`event: ping\ndata: ${latestSeq()}\n\n`), 10_000)
            cleanup = () => {
              clearInterval(heartbeat)
              unsubscribe()
            }
            request.signal.addEventListener('abort', () => {
              cleanup()
              try {
                controller.close()
              } catch {
                /* already closed */
              }
            })
          },
          cancel() {
            cleanup()
          },
        })
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Content-Encoding': 'identity',
          },
        })
      },
    },
  },
})
