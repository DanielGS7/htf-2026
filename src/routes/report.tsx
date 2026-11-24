/**
 * @file Route /report: mobile-first field report (the audience's phone screen). Codename + big points
 * readout, EchoComposer hero (text/voice/photo, offline queue), critical-alert opt-in and a live feed
 * of the latest glitches. Refreshes on live events. During a "Desync Protocol" game (F33) it adds the
 * lobby card, role reveal + chip, round banner, fix tasks, emergency meeting, vote screen, end screen and
 * (Desync only) the hidden sabotage console behind a 1s long-press on the points tile. Idle = unchanged.
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
import { useGame } from '#/lib/useGame.ts'
import { EndScreen } from '#/components/game/phone/EndScreen.tsx'
import { FixTasks } from '#/components/game/phone/FixTasks.tsx'
import { MeetingCallButton, VoteScreen } from '#/components/game/phone/Meeting.tsx'
import { RoleChip, RoleReveal } from '#/components/game/phone/RoleReveal.tsx'
import { LobbyCard, RoundBanner } from '#/components/game/phone/RoundBanner.tsx'
import { SabotageSheet, useHoldGesture } from '#/components/game/phone/SabotageConsole.tsx'

const SEEN_KEY = 'gg-role-seen'
const store = {
  get: () => {
    try {
      return sessionStorage.getItem(SEEN_KEY)
    } catch {
      return null
    }
  },
  set: (v: string | null) => {
    try {
      if (v) sessionStorage.setItem(SEEN_KEY, v)
      else sessionStorage.removeItem(SEEN_KEY)
    } catch {
      /* ignore */
    }
  },
}

export const Route = createFileRoute('/report')({
  loader: () => getReportData(),
  component: ReportPage,
})

function ReportPage() {
  const { stats, glitches } = Route.useLoaderData()
  const me = useMe()
  const router = useRouter()
  const [score, setScore] = useState<number | null>(null)
  const { state, view, refresh, ready } = useGame()
  const [revealOpen, setRevealOpen] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [endDismissed, setEndDismissed] = useState(false)
  const phase = state.phase
  const playing = phase === 'playing'
  const role = view?.role ?? null
  const isDesync = role === 'desync' && playing && !view?.ejected
  const hold = useHoldGesture(isDesync, () => setConsoleOpen(true))
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => setScore(null), [stats?.score])
  useEffect(() => () => clearTimeout(timer.current), [])
  useLiveEvents((e) => {
    if (e.type === 'glitch.created' || e.type === 'glitch.updated' || e.type === 'echo.created') {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void router.invalidate(), 400)
    }
  })

  // Role card once per round: when playing starts and the role is known. Reset in lobby/idle.
  useEffect(() => {
    if (!ready) return
    if (phase === 'idle' || phase === 'lobby') {
      store.set(null)
      setEndDismissed(false)
    } else if ((phase === 'playing' || phase === 'meeting') && role && !store.get()) {
      store.set('1')
      setRevealOpen(true)
    }
  }, [phase, role, ready])
  useEffect(() => {
    if (!isDesync) setConsoleOpen(false)
  }, [isDesync])

  const shown = score ?? stats?.score ?? 0

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pt-[env(safe-area-inset-top)]">
      {phase === 'lobby' && <LobbyCard />}
      {playing && <RoundBanner state={state} />}
      {playing && view?.ejected && <p className="glass rounded-md px-4 py-3 text-center font-semibold text-muted">You were ejected. Watch the round from here.</p>}

      <header>
        <Link
          to="/leaderboard"
          title="Open the leaderboard"
          {...hold.bind}
          onClick={(e) => {
            if (hold.consumed()) e.preventDefault()
          }}
          className="glass hud relative flex min-h-20 touch-manipulation items-center justify-between gap-3 overflow-hidden rounded-lg px-4 py-3 select-none"
        >
          {hold.progress > 0 && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-magic-soft/70" style={{ transform: `scaleX(${hold.progress})` }} />}
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

      {playing && !view?.ejected && <FixTasks onPoints={() => void router.invalidate()} />}
      {playing && view && (
        <MeetingCallButton enabled={view.canCallMeeting} meetingsLeft={state.meetingsLeft} onDone={() => void refresh()} />
      )}

      <EchoComposer onScore={setScore} />

      <div className="flex flex-wrap items-start gap-3">
        <NotifyToggle />
        {role && (playing || phase === 'meeting') && <RoleChip role={role} />}
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

      {revealOpen && role && <RoleReveal role={role} onClose={() => setRevealOpen(false)} />}
      {consoleOpen && view && <SabotageSheet view={view} onClose={() => setConsoleOpen(false)} onChanged={() => void refresh()} />}
      {phase === 'meeting' && <VoteScreen state={state} view={view} myId={me?.guardianId ?? null} onVoted={() => void refresh()} />}
      {phase === 'ended' && !endDismissed && <EndScreen state={state} view={view} score={shown} onClose={() => setEndDismissed(true)} />}
    </div>
  )
}
