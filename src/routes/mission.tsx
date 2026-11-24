/**
 * @file Route /mission — full-screen mission control for the projector: live Achrona map in the
 * centre, magic gauge, district sensor sparklines, live echo feed, top glitches and a big QR code
 * ("Scan to join the defense"). Lockdown takes over the map with a huge pulsing banner.
 * Press `f` for browser fullscreen. Optional `?host=https://venue.example` overrides the QR base URL.
 * @usedBy router
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Maximize2, Minimize2, ShieldAlert, Users } from 'lucide-react'
import { AchronaMap } from '#/components/map/AchronaMap.tsx'
import { DistrictSparklines } from '#/components/mission/DistrictSparklines.tsx'
import { EchoFeed } from '#/components/mission/EchoFeed.tsx'
import { JoinQr } from '#/components/mission/JoinQr.tsx'
import { MagicGauge } from '#/components/mission/MagicGauge.tsx'
import { SimStatus } from '#/components/mission/SimStatus.tsx'
import { TopGlitches } from '#/components/mission/TopGlitches.tsx'
import { useOpsLive } from '#/components/mission/useOpsLive.ts'
import { useTheme } from '#/components/layout/AppProviders.tsx'
import { getOpsSnapshot } from '#/lib/ops.functions.ts'

export const Route = createFileRoute('/mission')({
  validateSearch: (s: Record<string, unknown>): { host?: string } => ({
    host: typeof s.host === 'string' && /^https?:\/\//.test(s.host) ? s.host : undefined,
  }),
  loader: () => getOpsSnapshot(),
  component: MissionControl,
})

function Panel({ title, icon, children, className = '' }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`glass flex min-h-0 flex-col rounded-2xl p-4 ${className}`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-[0.2em] text-muted uppercase">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

function Clock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    f()
    const i = setInterval(f, 1000)
    return () => clearInterval(i)
  }, [])
  return <span className="font-mono text-lg tabular-nums text-muted">{t}</span>
}

function MissionControl() {
  const snap = useOpsLive(Route.useLoaderData(), 4000)
  const { host } = Route.useSearch()
  const navigate = useNavigate()
  const [full, setFull] = useState(false)
  const { lockdown } = useTheme()

  // The overlay is fixed: stop the page behind it from scrolling.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'f') toggleFull()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const lock = snap.lockdown.active || snap.magic < 40
  const reason = snap.lockdown.reason ?? (snap.magic < 40 ? `Magic level critical (${snap.magic}%)` : null)

  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-y-auto bg-app lg:overflow-hidden ${lockdown ? 'pt-9' : ''}`}>
      <div className="starfield pointer-events-none absolute inset-0 opacity-60" aria-hidden />

      <header className="relative z-10 flex flex-wrap items-center gap-3 px-5 pt-4 pb-1">
        <Link to="/" title="Back to the overview" className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted hover:bg-subtle hover:text-fg">
          <ArrowLeft className="size-4" />
          Overview
        </Link>
        <h1 className="font-display text-2xl font-extrabold tracking-wide">
          <span className="glow-text">ACHRONA</span> <span className="text-fg">MISSION CONTROL</span>
        </h1>
        <div className="ml-2">
          <SimStatus sim={snap.sim} />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Clock />
          <button
            type="button"
            onClick={toggleFull}
            title={full ? 'Exit fullscreen (f)' : 'Fullscreen (f)'}
            aria-label={full ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="rounded-lg border border-line p-2 text-muted hover:bg-subtle hover:text-fg"
          >
            {full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </header>

      <main className="relative z-10 grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)_minmax(19rem,27rem)] lg:grid-rows-1">
        {/* left: gauge + sensors */}
        <div className="flex min-h-0 flex-col gap-4">
          <Panel title="Magic level" className="items-stretch">
            <MagicGauge level={snap.magic} size="lg" />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Open glitches" value={snap.glitches.length} tone={snap.glitches.length ? 'text-warning' : 'text-success'} />
              <Stat label="Districts at risk" value={snap.latest.filter((r) => r.magic < 60).length} tone={snap.latest.some((r) => r.magic < 60) ? 'text-danger' : 'text-success'} />
              <Stat label="Guardians" value={snap.guardianCount} />
            </div>
          </Panel>
          <Panel title="Sensor grid" className="flex-1">
            <DistrictSparklines latest={snap.latest} history={snap.history} large />
          </Panel>
        </div>

        {/* centre: map */}
        <div className="relative min-h-[22rem] min-w-0">
          <AchronaMap
            glitches={snap.glitches}
            readings={snap.latest}
            className="h-full w-full"
            onSelect={(id) => void navigate({ to: '/glitches/$glitchId', params: { glitchId: id } })}
          />
          {lock && <LockdownOverlay reason={reason} />}
        </div>

        {/* right: join + glitches + feed */}
        <div className="flex min-h-0 flex-col gap-4">
          <Panel title="Join the defense">
            <div className="flex items-center gap-4">
              <JoinQr base={host} size={150} />
              <div className="min-w-0">
                <p className="font-display text-2xl leading-tight font-bold text-fg">Scan to join the defense</p>
                <p className="mt-2 flex items-center gap-2 text-lg text-accent">
                  <Users className="size-5" />
                  <span className="font-mono font-bold tabular-nums">{snap.guardianCount}</span> guardians
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="Top glitches">
            <TopGlitches glitches={snap.glitches} limit={4} onSelect={(id) => void navigate({ to: '/glitches/$glitchId', params: { glitchId: id } })} />
          </Panel>
          <Panel title="Live echoes" className="min-h-[14rem] flex-1 overflow-hidden">
            <EchoFeed echoes={snap.echoes} limit={8} />
          </Panel>
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value, tone = 'text-fg' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-subtle/60 px-2 py-2">
      <div className={`font-display text-3xl font-extrabold tabular-nums ${tone}`}>{value}</div>
      <div className="text-[11px] tracking-wider text-muted uppercase">{label}</div>
    </div>
  )
}

function LockdownOverlay({ reason }: { reason: string | null }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center px-6 pt-5" role="alert">
      <div className="flex items-center gap-4 rounded-2xl border-2 border-danger bg-danger/20 px-8 py-3 shadow-[0_0_80px_-10px_var(--danger)] backdrop-blur-sm">
        <ShieldAlert className="size-12 animate-pulse text-danger" />
        <div className="text-center">
          <div className="font-display text-5xl leading-none font-black tracking-[0.25em] text-danger uppercase animate-pulse">Lockdown</div>
          {reason && <div className="mt-1 text-lg font-semibold text-fg">{reason}</div>}
        </div>
        <ShieldAlert className="size-12 animate-pulse text-danger" />
      </div>
    </div>
  )
}
