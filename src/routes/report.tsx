/**
 * @file Route /report: mobile-first field report (the audience's phone screen). Codename + big points
 * readout, EchoComposer hero (text/voice/photo, offline queue), critical-alert opt-in and a live feed
 * of the latest glitches. Refreshes on live events.
 * @usedBy router (QR/quick-join landing page)
 */
import { useEffect, useRef, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { MessageCircleQuestion } from 'lucide-react'
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
      <header>
        <Link
          to="/leaderboard"
          title="Open the leaderboard"
          className="glass hud flex min-h-20 items-center justify-between gap-3 rounded-lg px-4 py-3"
        >
          <span className="min-w-0">
            <span className="label block">Guardian</span>
            <span className="block font-display text-2xl leading-tight font-bold break-words">{me?.codename ?? stats?.codename ?? 'Defender'}</span>
          </span>
          <span className="shrink-0 text-right">
            <span key={shown} className="float-in block font-display text-5xl leading-none font-bold text-accent-ink tabular-nums">{shown}</span>
            <span className="label mt-1 block">{stats ? `points · rank #${stats.rank}` : 'points'}</span>
          </span>
        </Link>
      </header>

      <EchoComposer onScore={setScore} />

      <div className="flex flex-wrap items-start gap-3">
        <NotifyToggle />
        <Link to="/oracle" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-subtle px-3 text-sm font-semibold text-fg hover:border-accent/60 hover:bg-subtle-hover">
          <MessageCircleQuestion className="size-4" />
          Ask the Oracle
        </Link>
      </div>

      <section aria-labelledby="feed-title">
        <h2 id="feed-title" className="label mb-2 px-1">
          Live from the grid
        </h2>
        <LiveFeed glitches={glitches} />
      </section>
    </div>
  )
}
