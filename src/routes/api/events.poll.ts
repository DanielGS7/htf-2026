/**
 * @file GET /api/events/poll?since=<seq> — long-poll fallback for the live stream, for networks where
 * SSE is buffered (e.g. Cloudflare quick tunnels). Returns `{ latest, events, gap }` immediately if
 * anything happened after `since`; otherwise waits up to 20s for the next event (then answers empty).
 * `since=-1` just returns the current `latest` (initial sync).
 * @usedBy src/lib/useLiveEvents.ts (fallback mode)
 */
import { createFileRoute } from '@tanstack/react-router'
import { eventsSince, latestSeq, subscribe } from '#/server/bus.ts'

const WAIT_MS = 20_000

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export const Route = createFileRoute('/api/events/poll')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const since = Number(new URL(request.url).searchParams.get('since') ?? '-1')
        if (!Number.isFinite(since) || since < 0) return json({ latest: latestSeq(), events: [], gap: false })

        const now = eventsSince(since)
        if (now.events.length || now.gap) return json({ latest: latestSeq(), ...now })

        // Nothing new: wait for the next event (batching anything that lands in the next 50ms).
        await new Promise<void>((resolve) => {
          let timer: ReturnType<typeof setTimeout>
          const done = () => {
            clearTimeout(timer)
            unsubscribe()
            resolve()
          }
          const unsubscribe = subscribe(() => {
            clearTimeout(timer)
            timer = setTimeout(done, 50)
          })
          timer = setTimeout(done, WAIT_MS)
          request.signal.addEventListener('abort', done)
        })
        return json({ latest: latestSeq(), ...eventsSince(since) })
      },
    },
  },
})
