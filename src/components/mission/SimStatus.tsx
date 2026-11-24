/**
 * @file Plate showing the simulator phase (CALM / UNDER ATTACK / RECOVERING) with the scenario
 * name and a progress bar while an attack runs. Elapsed time is extrapolated locally between syncs.
 * @exports SimStatus
 * @usedBy src/routes/mission.tsx, src/routes/admin.tsx
 */
import { useEffect, useState } from 'react'
import { Activity, ShieldCheck, Skull, Sprout } from 'lucide-react'
import type { SimulatorState } from '#/server/simulator.ts'

export function SimStatus({ sim }: { sim: SimulatorState }) {
  const [tick, setTick] = useState(0)
  const [syncedAt, setSyncedAt] = useState(0)
  useEffect(() => {
    setSyncedAt(Date.now())
  }, [sim])
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  void tick

  const attack = sim.phase === 'attack' && sim.scenario
  const elapsed = attack && syncedAt ? Math.min(sim.scenario!.durationMs, sim.scenario!.elapsedMs + (Date.now() - syncedAt)) : 0
  const pct = attack ? (elapsed / sim.scenario!.durationMs) * 100 : 0

  const [Icon, label, cls] = attack
    ? [Skull, `UNDER ATTACK: ${sim.scenario!.name}`, 'border-danger/50 bg-danger/15 text-danger']
    : sim.phase === 'recovering'
      ? [Sprout, 'RECOVERING', 'border-warning/40 bg-warning/10 text-warning']
      : sim.running
        ? [ShieldCheck, 'ACHRONA CALM', 'border-success/40 bg-success/10 text-success']
        : [Activity, 'STANDBY', 'border-line bg-subtle text-muted']

  return (
    <div className={`relative overflow-hidden rounded-md border px-4 py-1.5 ${cls}`}>
      {attack && <div className="absolute inset-y-0 left-0 bg-danger/20" style={{ width: `${pct}%`, transition: 'width 1s linear' }} />}
      <div className="relative flex items-center gap-2 font-display text-sm font-bold tracking-widest uppercase">
        <Icon className={`size-4 ${attack ? 'animate-pulse' : ''}`} />
        {label}
      </div>
    </div>
  )
}
