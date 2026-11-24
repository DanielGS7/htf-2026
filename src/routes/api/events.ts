/**
 * @file GET /api/events — Server-Sent Events stream of LiveEvent JSON (one per `data:` line).
 * Sends a heartbeat comment every 15s so proxies/tunnels keep the connection open.
 * @usedBy src/lib/useLiveEvents.ts (EventSource)
 */
import { createFileRoute } from '@tanstack/react-router'
import { subscribe } from '#/server/bus.ts'

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
            send(': connected\n\n')
            const unsubscribe = subscribe((event) => send(`data: ${JSON.stringify(event)}\n\n`))
            const heartbeat = setInterval(() => send(': ping\n\n'), 15_000)
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
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
