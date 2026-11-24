/**
 * @file Route /admin — Command deck (commander only; defenders see a "forbidden" state).
 * PageHeader + HUD panels: simulator start/stop and Desync "war plan" cards (banner accent, danger plate
 * Launch buttons), reset demo (two-step confirm), lockdown control with a reason, live magic gauge +
 * sensor bars, the "Desync Protocol" game lobby panel (GameLobbyPanel), and the guardian table with role change.
 * @usedBy router
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Gamepad2, Lock, Monitor, Play, RotateCcw, ShieldAlert, ShieldCheck, Square, Swords, Users } from 'lucide-react'
import { Badge } from '#/components/ui/Badge.tsx'
import { Button } from '#/components/ui/Button.tsx'
import { PageHeader } from '#/components/ui/PageHeader.tsx'
import { Input } from '#/components/ui/Input.tsx'
import { GameLobbyPanel } from '#/components/game/admin/GameLobbyPanel.tsx'
import { MagicGauge } from '#/components/mission/MagicGauge.tsx'
import { DistrictSparklines } from '#/components/mission/DistrictSparklines.tsx'
import { SimStatus } from '#/components/mission/SimStatus.tsx'
import { useOpsLive } from '#/components/mission/useOpsLive.ts'
import { useToast } from '#/components/ui/Toast.tsx'
import {
  getOpsSnapshot,
  listGuardians,
  setGuardianRole,
  simReset,
  simStart,
  simStop,
  simTrigger,
  toggleLockdown,
  type GuardianRow,
} from '#/lib/ops.functions.ts'
import type { Role } from '#/lib/glitch.ts'

export const Route = createFileRoute('/admin')({
  loader: async ({ context }) => {
    // Defenders get the forbidden state; don't even try the commander-only calls.
    if (context.me?.role !== 'commander') return { snap: null, guardians: [] as GuardianRow[] }
    const [snap, guardians] = await Promise.all([getOpsSnapshot(), listGuardians()])
    return { snap, guardians }
  },
  component: AdminPage,
})

function Section({ title, icon, children, className = '', hud = false }: { title: string; icon: ReactNode; children: ReactNode; className?: string; hud?: boolean }) {
  return (
    <section className={`glass rounded-md p-5 ${hud ? 'hud' : ''} ${className}`}>
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold tracking-[0.12em] text-fg uppercase">
        <span className="text-accent-ink">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function AdminPage() {
  const data = Route.useLoaderData()
  if (!data.snap) return <Forbidden />
  return <Deck snap={data.snap} guardians={data.guardians} />
}

function Forbidden() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <Lock className="mx-auto size-12 text-muted" />
      <h1 className="mt-4 font-display text-3xl font-bold tracking-wide text-fg uppercase">Commanders only</h1>
      <p className="mt-2 text-muted">The command deck controls the simulator and lockdown. Ask a commander to promote you, or head back to the overview.</p>
      <Link to="/" className="mt-5 inline-block text-accent underline">
        Back to the overview
      </Link>
    </div>
  )
}

function Deck({ snap: initial, guardians: initialGuardians }: { snap: Awaited<ReturnType<typeof getOpsSnapshot>>; guardians: GuardianRow[] }) {
  const snap = useOpsLive(initial, 3000)
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [reason, setReason] = useState('')
  const [guardians, setGuardians] = useState(initialGuardians)
  const [filter, setFilter] = useState('')

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key)
    try {
      await fn()
      snap.refresh()
      if (ok) toast({ tone: 'success', message: ok })
    } catch (err) {
      toast({ tone: 'danger', message: err instanceof Error ? err.message : 'Action failed' })
    } finally {
      setBusy(null)
    }
  }

  const attack = snap.sim.phase === 'attack'
  const shown = useMemo(() => guardians.filter((g) => g.codename.toLowerCase().includes(filter.toLowerCase())), [guardians, filter])

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        label="Commander console"
        title="Command"
        subtitle={
          <span className="flex flex-wrap items-center gap-3">
            <SimStatus sim={snap.sim} />
          </span>
        }
        actions={
          <Link to="/mission" className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-subtle px-4 text-sm font-semibold tracking-wide text-fg uppercase [font-stretch:92%] hover:border-accent/60 hover:bg-subtle-hover">
            <Monitor className="size-4" />
            Open big screen
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <div className="grid content-start gap-5">
          <Section title="Magic" hud icon={<Swords className="size-5" />}>
            <MagicGauge level={snap.magic} size="lg" />
          </Section>
          <Section title="Sensors" icon={<Monitor className="size-5" />}>
            <DistrictSparklines latest={snap.latest} history={snap.history} />
          </Section>
        </div>

        <div className="grid content-start gap-5">
          <Section title="Desync Protocol" hud icon={<Gamepad2 className="size-5" />}>
            <GameLobbyPanel />
          </Section>

          <Section title="Command deck" hud icon={<Play className="size-5" />}>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={snap.sim.running ? 'success' : 'neutral'}>{snap.sim.running ? 'Running: tick every 3s' : 'Stopped'}</Badge>
              {snap.sim.running ? (
                <Button variant="secondary" disabled={busy !== null} onClick={() => run('stop', simStop)} title="Pause sensor readings">
                  <Square className="size-4" /> Stop
                </Button>
              ) : (
                <Button disabled={busy !== null} onClick={() => run('start', simStart)} title="Start the 3-second sensor ticks">
                  <Play className="size-4" /> Start simulator
                </Button>
              )}
            </div>
            <p className="mt-3 text-sm text-muted">Writes one sensor reading per district every 3 seconds. Nothing moves while it is stopped. Triggering a Desync starts it automatically.</p>

            <div className="ornament mt-6 mb-4">
              <span className="size-1.5 rotate-45 bg-magic" />
            </div>
            <h3 className="label mb-3 text-fg!">Trigger a Desync: choose a war plan</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {snap.sim.scenarios.map((s) => (
                <div key={s.id} className="relative flex flex-col overflow-hidden border border-danger/40 bg-danger/5 p-4">
                  <img src="/htf/banner-orange.avif" alt="" aria-hidden width={64} height={67} className="pointer-events-none absolute -top-1 right-3 h-[4.5rem] w-auto" />
                  <div className="pr-16 font-display text-xl font-bold tracking-wide text-fg uppercase">{s.name}</div>
                  <p className="mt-1 min-h-[3.5rem] pr-16 text-sm text-fg/80">{s.description}</p>
                  <Button variant="danger" size="lg" className="mt-3 w-full" disabled={busy !== null || attack} onClick={() => run(`sc-${s.id}`, () => simTrigger({ data: { scenario: s.id } }), `${s.name} launched`)}>
                    <Swords className="size-5" /> {attack ? 'Attack in progress' : 'Launch'}
                  </Button>
                </div>
              ))}
            </div>
          </Section>

          <div className="grid gap-5 md:grid-cols-2">
            <Section title="Lockdown" icon={snap.lockdown.active ? <ShieldAlert className="size-5 text-danger" /> : <ShieldCheck className="size-5" />}>
              <p className={`font-display text-xl font-bold tracking-wide uppercase ${snap.lockdown.active ? 'text-danger' : 'text-success'}`}>
                {snap.lockdown.active ? `Lockdown active${snap.lockdown.reason ? `: ${snap.lockdown.reason}` : ''}` : 'No lockdown'}
              </p>
              {!snap.lockdown.active && (
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={120}
                  placeholder="Reason (optional), e.g. Desync detected"
                  aria-label="Lockdown reason"
                  className="mt-3"
                />
              )}
              <Button
                variant={snap.lockdown.active ? 'secondary' : 'danger'}
                className="mt-3 w-full"
                disabled={busy !== null}
                onClick={() => run('lock', () => toggleLockdown({ data: { active: !snap.lockdown.active, reason: reason || null } }))}
              >
                {snap.lockdown.active ? 'Lift lockdown' : 'Engage lockdown'}
              </Button>
              <p className="mt-2 text-xs text-muted">Also engages automatically when magic drops below 40% and lifts above 60%.</p>
            </Section>

            <Section title="Reset demo" icon={<RotateCcw className="size-5" />}>
              <p className="text-sm text-muted">Restores the seed glitches and echoes, resets scores, heals every district and lifts the lockdown. Echoes from the audience are deleted.</p>
              {confirmReset ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="danger"
                    className="flex-1"
                    disabled={busy !== null}
                    onClick={() => {
                      setConfirmReset(false)
                      void run('reset', simReset, 'Demo reset')
                    }}
                  >
                    Yes, reset everything
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" className="mt-3 w-full" disabled={busy !== null} onClick={() => setConfirmReset(true)}>
                  <RotateCcw className="size-4" /> Reset demo
                </Button>
              )}
            </Section>
          </div>

          <Section title={`Guardians (${guardians.length})`} icon={<Users className="size-5" />}>
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by codename" aria-label="Filter guardians" className="mb-3" />
            <div className="max-h-96 overflow-y-auto border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card-strong text-left font-mono text-xs tracking-[0.16em] text-muted uppercase">
                  <tr>
                    <th className="px-3 py-2">Codename</th>
                    <th className="px-3 py-2">Points</th>
                    <th className="px-3 py-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((g) => (
                    <tr key={g.guardianId} className="border-t border-line">
                      <td className="px-3 py-2 font-medium text-fg">{g.codename}</td>
                      <td className="px-3 py-2 font-mono text-muted">{g.score}</td>
                      <td className="px-3 py-2">
                        <select
                          value={g.role}
                          disabled={busy !== null}
                          aria-label={`Role of ${g.codename}`}
                          onChange={(e) =>
                            void run(`role-${g.guardianId}`, async () => setGuardians(await setGuardianRole({ data: { guardianId: g.guardianId, role: e.target.value as Role } })))
                          }
                          className="h-9 rounded-md border border-line bg-subtle px-2 text-fg focus:outline-2 focus:outline-accent"
                        >
                          <option value="defender">defender</option>
                          <option value="commander">commander</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {!shown.length && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-muted">
                        No guardians match.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
