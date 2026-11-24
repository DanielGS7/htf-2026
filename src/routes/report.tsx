/**
 * @file Route /report: mobile-first field report. Greeting + points, EchoComposer (text/voice/photo,
 * offline queue), critical-alert opt-in and a live feed of the latest glitches. Refreshes on live events.
 * @usedBy router (QR/quick-join landing page)
 */
import { useEffect, useRef, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { MessageCircleQuestion, Trophy } from 'lucide-react'
import { EchoComposer } from '#/components/field/EchoComposer.tsx'
import { LiveFeed } from '#/components/field/LiveFeed.tsx'
import { NotifyToggle } from '#/components/field/NotifyToggle.tsx'
import { getReportData } from '#/lib/field.functions.ts'
import { useMe } from '#/lib/auth.functions.ts'
import { useLiveEvents } from '#/lib/useLiveEvents.ts'

export const Route = createFileRoute('/report')({
  loader: () => getReportData(),
  component: ReportPage,
})

function ReportPage() {
  const { stats, glitches } = Route.useLoaderData()
  const me = useMe()
  const router = useRouter()
  const [score, setScore] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => setScore(null), [stats?.score])
  useEffect(() => () => clearTimeout(timer.current), [])
  useLiveEvents((e) => {
    if (e.type === 'glitch.created' || e.type === 'glitch.updated' || e.type === 'echo.created') {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void router.invalidate(), 400)
    }
  })

  const shown = score ?? stats?.score ?? 0

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pt-[env(safe-area-inset-top)]">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">Guardian</p>
          <h1 className="truncate text-2xl font-bold">{me?.codename ?? stats?.codename ?? 'Defender'}</h1>
        </div>
        <Link to="/leaderboard" title="Open the leaderboard" className="glass flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-4 py-2">
          <Trophy className="size-5 text-warning" />
          <span className="text-right leading-tight">
            <span key={shown} className="float-in block text-lg font-bold tabular-nums">{shown}</span>
            <span className="block text-[11px] text-muted">{stats ? `points · #${stats.rank}` : 'points'}</span>
          </span>
        </Link>
      </header>

      <EchoComposer onScore={setScore} />

      <div className="flex flex-wrap items-start gap-3">
        <NotifyToggle />
        <Link to="/oracle" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-subtle px-3 text-sm font-medium text-muted hover:text-fg">
          <MessageCircleQuestion className="size-4" />
          Ask the Oracle
        </Link>
      </div>

      <section aria-labelledby="feed-title">
        <h2 id="feed-title" className="mb-2 px-1 text-lg font-semibold">
          Live from the grid
        </h2>
        <LiveFeed glitches={glitches} />
      </section>
    </div>
  )
}
