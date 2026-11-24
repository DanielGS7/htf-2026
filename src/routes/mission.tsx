/**
 * @file Route /mission — full-screen mission control for the projector (fixed, full-height grid, no dead
 * zones): left = huge magic gauge + stats + sensor grid, centre = Achrona map with the live echo feed
 * below it, right = QR "Scan to join the defense" (large while calm, compact under attack) + top glitches.
 * Attack/lockdown: purple voxel lightning creeps in from both screen edges and a big alert plate sits
 * above the map (never over it). After an attack a short "Achrona holds" plate appears when magic recovers.
 * Game layer (F33, phase !== idle): lobby / meeting / ended takeovers replace the grid, a round HUD strip sits above it
 * while playing, a 3s "sabotage discovered" banner overlays it, and Mission Control speaks (mute + "Enable voice" in the header).
 * Eye-orb cursor on this page only. Press `f` for fullscreen; `?host=https://venue.example` overrides the QR base URL.
 * @usedBy router
 */
import { AiBadge } from '#/components/ai/AiBadge.tsx'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Maximize2, Minimize2, ShieldAlert, ShieldCheck, Skull, Users, Volume2, VolumeX } from 'lucide-react'
import { AchronaMap } from '#/components/map/AchronaMap.tsx'
import { DiscoveryBanner } from '#/components/game/projector/DiscoveryBanner.tsx'
import { EndedTakeover } from '#/components/game/projector/EndedTakeover.tsx'
import { GameStrip } from '#/components/game/projector/GameStrip.tsx'
import { LobbyTakeover } from '#/components/game/projector/LobbyTakeover.tsx'
import { MeetingTakeover } from '#/components/game/projector/MeetingTakeover.tsx'
import { useAnnouncer } from '#/components/game/projector/useAnnouncer.ts'
import { useGameLive } from '#/components/game/projector/useGameLive.ts'
import { DistrictSparklines } from '#/components/mission/DistrictSparklines.tsx'
import { EchoFeed } from '#/components/mission/EchoFeed.tsx'
import { JoinQr } from '#/components/mission/JoinQr.tsx'
import { MagicGauge } from '#/components/mission/MagicGauge.tsx'
import { SimStatus } from '#/components/mission/SimStatus.tsx'
import { TopGlitches } from '#/components/mission/TopGlitches.tsx'
import { useOpsLive } from '#/components/mission/useOpsLive.ts'
import { useTheme } from '#/components/layout/AppProviders.tsx'
import { getGameState } from '#/lib/game.functions.ts'
import { IDLE_GAME_STATE } from '#/lib/game.ts'
import { getOpsSnapshot } from '#/lib/ops.functions.ts'

export const Route = createFileRoute('/mission')({
  validateSearch: (s: Record<string, unknown>): { host?: string } => ({
    host: typeof s.host === 'string' && /^https?:\/\//.test(s.host) ? s.host : undefined,
  }),
  loader: async () => {
    const [snap, game] = await Promise.all([getOpsSnapshot(), getGameState().catch(() => IDLE_GAME_STATE)])
    return { snap, game }
  },
  component: MissionControl,
})

function Panel({ title, icon, children, className = '', hud = false }: { title: string; icon?: ReactNode; children: ReactNode; className?: string; hud?: boolean }) {
  return (
    <section className={`glass flex shrink-0 flex-col rounded-md p-4 lg:min-h-0 lg:shrink [@media(max-height:800px)]:p-3 ${hud ? 'hud' : ''} ${className}`}>
      <h2 className="label mb-3 flex items-center gap-2 text-sm! font-semibold [@media(max-height:800px)]:mb-1.5">
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
  return <span className="font-mono text-2xl tabular-nums text-muted [@media(max-height:800px)]:text-xl">{t}</span>
}

/** Purple voxel lightning creeping in from the screen edges (attack = partly in, lockdown = further in). Sits BEHIND the panels (z-0), so it never covers data. */
function EdgeLightning({ level }: { level: 0 | 1 | 2 }) {
  const shift = level === 2 ? 42 : level === 1 ? 62 : 110
  const common = 'pointer-events-none absolute z-0 h-auto w-[min(22vw,26rem)] max-w-none transition-[transform,opacity] duration-[1400ms] ease-out'
  return (
    <>
      <img src="/htf/lightning-left.avif" alt="" aria-hidden className={`${common} top-0 left-0 ${level === 2 ? 'glitch' : ''}`} style={{ transform: `translateX(-${shift}%)`, opacity: level ? 0.8 : 0, maskImage: 'linear-gradient(to right, #000 50%, transparent)' }} />
      <img src="/htf/lightning-right.avif" alt="" aria-hidden className={`${common} right-0 bottom-0 ${level === 2 ? 'glitch' : ''}`} style={{ transform: `translateX(${shift}%)`, opacity: level ? 0.8 : 0, maskImage: 'linear-gradient(to left, #000 50%, transparent)' }} />
    </>
  )
}

function MissionControl() {
  const loaded = Route.useLoaderData()
  const snap = useOpsLive(loaded.snap, 4000)
  const { state: game, discovery } = useGameLive(loaded.game)
  const voice = useAnnouncer(game, discovery, snap.magic)
  const { host } = Route.useSearch()
  const navigate = useNavigate()
  const [full, setFull] = useState(false)
  const { lockdown } = useTheme()
  const [holds, setHolds] = useState(false)
  // QR size follows the screen height so the glitch list below keeps its room (180px at 900p, 216px at 1080p).
  const [qrSize, setQrSize] = useState(200)
  useEffect(() => {
    const f = () => setQrSize(Math.max(120, Math.min(260, Math.round(window.innerHeight * 0.2))))
    f()
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])

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

  const attack = snap.sim.phase === 'attack'
  const lock = snap.lockdown.active || snap.magic < 40
  const reason = snap.lockdown.reason ?? (snap.magic < 40 ? `Magic level critical (${snap.magic}%)` : null)
  const alarm = attack || lock

  // "Achrona holds": once an attack/lockdown is over and magic is healthy again, show a plate for a few seconds.
  const wasAlarm = useRef(false)
  useEffect(() => {
    if (alarm) {
      wasAlarm.current = true
      setHolds(false)
      return
    }
    if (wasAlarm.current && snap.magic >= 70) {
      wasAlarm.current = false
      setHolds(true)
      const t = setTimeout(() => setHolds(false), 9000)
      return () => clearTimeout(t)
    }
  }, [alarm, snap.magic])

  const open = (id: string) => void navigate({ to: '/glitches/$glitchId', params: { glitchId: id } })
  const atRisk = snap.latest.filter((r) => r.magic < 60).length

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col overflow-y-auto bg-app lg:overflow-hidden ${lockdown ? 'pt-11' : ''}`}
    >
      <div className="starfield pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <EdgeLightning level={lock ? 2 : attack ? 1 : 0} />

      <header className="relative z-10 flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-3 pb-1 lg:px-5 xl:gap-x-5 xl:px-9 [@media(max-height:800px)]:pt-1.5">
        <Link to="/" title="Back to the overview" aria-label="Overview" className="flex items-center gap-1.5 rounded-md px-2 py-1 text-base text-muted hover:bg-subtle hover:text-fg">
          <ArrowLeft className="size-5" />
          <span className="max-xl:hidden">Overview</span>
        </Link>
        <h1 className="flex shrink-0 items-center gap-4">
          <img src="/htf/curse-of-achrona.avif" alt="The Curse of Achrona" className="h-16 w-auto 2xl:h-20 [@media(max-height:800px)]:h-11" width={156} height={80} />
          <span className="font-display text-3xl font-bold tracking-[0.18em] text-fg uppercase max-xl:sr-only 2xl:text-4xl [@media(max-height:800px)]:text-2xl">Mission Control</span>
        </h1>
        <div className={alarm ? 'max-[1400px]:hidden [@media(max-height:800px)]:hidden' : ''}>
          <SimStatus sim={snap.sim} />
        </div>
        {/* Proof for the jury that a real model is triaging. Hidden during an alarm: the header needs the room. */}
        <div className={alarm ? 'hidden' : 'max-[1400px]:hidden [@media(max-height:800px)]:hidden'}>
          <AiBadge />
        </div>
        <div className="flex min-w-fit flex-1 justify-center">
          {lock ? (
            <LockdownPlate reason={reason} />
          ) : attack ? (
            <AttackPlate name={snap.sim.scenario?.name ?? 'Desync'} />
          ) : holds ? (
            <HoldsPlate />
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          {voice.needsEnable && (
            <button type="button" onClick={voice.enable} className="rounded-md border border-accent bg-accent/15 px-3 py-1.5 text-sm font-semibold tracking-wide text-fg uppercase hover:bg-accent/30">
              Enable voice
            </button>
          )}
          {voice.supported && (
            <button
              type="button"
              onClick={voice.toggleMuted}
              aria-pressed={voice.muted}
              title={voice.muted ? 'Unmute Mission Control' : 'Mute Mission Control'}
              aria-label={voice.muted ? 'Unmute voice' : 'Mute voice'}
              className="rounded-md border border-line p-2 text-muted hover:bg-subtle hover:text-fg"
            >
              {voice.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
          )}
          <Clock />
          <button
            type="button"
            onClick={toggleFull}
            title={full ? 'Exit fullscreen (f)' : 'Fullscreen (f)'}
            aria-label={full ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="rounded-md border border-line p-2 text-muted hover:bg-subtle hover:text-fg"
          >
            {full ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </button>
        </div>
      </header>

      {game.phase === 'playing' && <GameStrip game={game} />}
      {game.phase === 'lobby' ? (
        <LobbyTakeover game={game} host={host} guardianCount={snap.guardianCount} qrSize={Math.max(150, Math.min(300, qrSize + 40))} />
      ) : game.phase === 'meeting' ? (
        <MeetingTakeover game={game} />
      ) : game.phase === 'ended' ? (
        <EndedTakeover game={game} />
      ) : (
      <main className="relative z-10 grid shrink-0 grid-cols-[minmax(0,1fr)] gap-4 [@media(max-height:800px)]:gap-3 px-4 py-4 lg:px-5 xl:px-9 [@media(max-height:800px)]:py-2.5 lg:min-h-0 lg:flex-1 lg:shrink lg:grid-cols-[clamp(15rem,24vw,32rem)_minmax(0,1fr)_clamp(16rem,24vw,32rem)] lg:grid-rows-1">
        {/* left: gauge + sensors */}
        <div className="flex flex-col gap-4 lg:min-h-0 [@media(max-height:800px)]:gap-2.5">
          <Panel title="Magic level" hud className="items-stretch">
            <MagicGauge level={snap.magic} size="lg" />
            <div className="mt-3 grid grid-cols-3 gap-2 [@media(max-height:800px)]:mt-1.5">
              <Stat label="Glitches" value={snap.glitches.length} tone={snap.glitches.length ? 'text-warning' : 'text-success'} />
              <Stat label="At risk" value={atRisk} tone={atRisk ? 'text-danger' : 'text-success'} />
              <Stat label="Guardians" short="Players" value={snap.guardianCount} />
            </div>
          </Panel>
          <Panel title="Sensor grid" className="min-h-[18rem] flex-1 overflow-hidden lg:min-h-[10rem]">
            <div className="min-h-0 flex-1 [container-type:size]">
              <DistrictSparklines latest={snap.latest} history={snap.history} large />
            </div>
          </Panel>
        </div>

        {/* centre: alert plate, map, echo feed (no overlays on the map) */}
        <div className="flex min-w-0 flex-col gap-4 lg:min-h-0 [@media(max-height:800px)]:gap-2.5">
          <AchronaMap glitches={snap.glitches} readings={snap.latest} className="aspect-[10/7] w-full shrink-0 lg:min-h-0 lg:shrink" onSelect={open} />
          {/* min height = room for one whole echo; the map gives up height first */}
          <Panel title="Live echoes" className="min-h-[10rem] flex-1 overflow-hidden lg:min-h-[8.5rem]">
            <div className="relative min-h-0 flex-1">
              <EchoFeed echoes={snap.echoes} limit={3} />
            </div>
          </Panel>
        </div>

        {/* right: join + glitches */}
        <div className="flex flex-col gap-4 lg:min-h-0 [@media(max-height:800px)]:gap-2.5">
          <Panel title="Join the defense" hud={!alarm}>
            {alarm ? (
              <div className="flex items-center gap-4">
                <JoinQr base={host} size={104} showUrl={false} />
                <div className="min-w-0">
                  <p className="font-display text-xl leading-tight font-bold text-fg 2xl:text-2xl">Scan to join the defense</p>
                  <Guardians n={snap.guardianCount} small />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="font-display text-3xl leading-none font-bold tracking-wide text-fg uppercase 2xl:text-4xl">Scan to join the defense</p>
                <JoinQr base={host} size={qrSize} showUrl={false} />
                <Guardians n={snap.guardianCount} />
              </div>
            )}
          </Panel>
          <Panel title="Top glitches" className="min-h-[20rem] flex-1 overflow-hidden lg:min-h-[8rem]">
            <div className="relative min-h-0 flex-1">
              <TopGlitches glitches={snap.glitches} limit={alarm ? 5 : 4} onSelect={open} />
            </div>
          </Panel>
        </div>
      </main>
      )}
      <DiscoveryBanner discovery={discovery} />
    </div>
  )
}

function Guardians({ n, small = false }: { n: number; small?: boolean }) {
  return (
    <p className={`flex items-center gap-2 text-accent-ink ${small ? 'mt-1 text-lg' : 'text-2xl'}`}>
      <Users className={small ? 'size-5' : 'size-6'} />
      <span className={`font-display font-bold tabular-nums ${small ? 'text-2xl' : 'text-3xl'}`}>{n}</span> guardians
    </p>
  )
}

/** `short` replaces the label below xl, where the tiles are ~58px wide. */
function Stat({ label, short, value, tone = 'text-fg' }: { label: string; short?: string; value: number; tone?: string }) {
  return (
    <div className="border border-line bg-subtle/60 px-1 py-1.5 text-center">
      <div className={`font-display text-4xl leading-none font-extrabold tabular-nums 2xl:text-5xl [@media(max-height:800px)]:text-3xl ${tone}`}>{value}</div>
      <div className="label mt-1 text-xs! tracking-wider whitespace-nowrap max-xl:tracking-normal max-xl:text-[0.75rem]! [@media(max-height:800px)]:mt-0.5">
        {short ? (
          <>
            <span className="max-xl:hidden">{label}</span>
            <span className="xl:hidden">{short}</span>
          </>
        ) : (
          label
        )}
      </div>
    </div>
  )
}

function LockdownPlate({ reason }: { reason: string | null }) {
  return (
    <div className="hazard-strip flex max-w-full min-w-0 shrink-0 items-center gap-3 px-5 py-2 text-[#160f1f] [@media(max-height:800px)]:gap-2 [@media(max-height:800px)]:px-3 [@media(max-height:800px)]:py-1" role="alert">
      <ShieldAlert className="size-10 shrink-0 animate-pulse [@media(max-height:800px)]:size-8" />
      <div className="min-w-0 shrink-0">
        <div className="font-display text-4xl leading-none font-black tracking-[0.28em] uppercase 2xl:text-5xl [@media(max-height:800px)]:text-3xl [@media(max-height:800px)]:tracking-[0.2em]">Lockdown</div>
        {reason && <div className="mt-0.5 max-w-[22rem] truncate text-base font-bold [@media(max-height:800px)]:text-sm">{reason}</div>}
      </div>
    </div>
  )
}

function AttackPlate({ name }: { name: string }) {
  return (
    <div className="glitch flex min-w-0 items-center gap-3 border-2 border-magic bg-magic/25 px-5 py-2" role="status">
      <Skull className="size-9 shrink-0 text-magic-soft max-xl:size-6" />
      <div className="truncate font-display text-3xl leading-none font-black tracking-[0.18em] text-fg uppercase max-xl:text-xl max-xl:tracking-[0.08em] 2xl:text-4xl">Desync: {name}</div>
    </div>
  )
}

function HoldsPlate() {
  return (
    <div className="float-in flex items-center gap-3 border-2 border-success bg-success/15 px-5 py-2" role="status">
      <ShieldCheck className="size-9 shrink-0 text-success" />
      <div className="font-display text-3xl leading-none font-black tracking-[0.18em] text-success uppercase 2xl:text-4xl">Achrona holds</div>
    </div>
  )
}
