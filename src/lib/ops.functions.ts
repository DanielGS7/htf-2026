/**
 * @file Server functions for real-time ops: the mission-control snapshot (magic, sensors, open
 * glitches, recent echoes, simulator + lockdown state), the public lockdown state, and the
 * commander-only controls (simulator start/stop/trigger/reset, lockdown toggle, guardian roles).
 * @exports getOpsSnapshot, getLockdownState, simStart, simStop, simTrigger, simReset, toggleLockdown,
 *   listGuardians, setGuardianRole, OpsSnapshot, GuardianRow
 * @usedBy src/routes/mission.tsx, src/routes/admin.tsx, src/components/mission/*, src/components/layout/AppProviders.tsx
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { count, desc, eq, ne } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { guardians, sensorReadings } from '#/db/schema.ts'
import { DISTRICTS, ROLES, type DistrictId, type Echo, type Glitch, type Role, type SensorReading } from '#/lib/glitch.ts'
import { requireCommander, requireGuardian } from '#/server/auth.ts'
import { publish } from '#/server/bus.ts'
import { computeMagicLevel, listEchoes, listGlitches } from '#/server/repo.ts'
import {
  SCENARIO_IDS,
  getLockdown,
  getSimulatorState,
  resetDemo,
  setLockdown,
  startSimulator,
  stopSimulator,
  triggerDesync,
  type SimulatorState,
} from '#/server/simulator.ts'

export type OpsSnapshot = {
  magic: number
  /** Latest reading per district (defaults to 100 when nothing was recorded yet). */
  latest: SensorReading[]
  /** Last ~40 magic values per district, oldest first (for sparklines). */
  history: Record<DistrictId, number[]>
  /** Non-FIXED glitches, newest first. */
  glitches: Glitch[]
  /** Recent accepted + rejected echoes, newest first. */
  echoes: Echo[]
  sim: SimulatorState
  lockdown: { active: boolean; reason: string | null }
  /** Number of non-system guardians (for "N guardians have joined"). */
  guardianCount: number
}

export type GuardianRow = { guardianId: string; codename: string; role: Role; score: number }

/** Public: any client (even before login) can seed its lockdown state from this. */
export const getLockdownState = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ active: boolean; reason: string | null }> => getLockdown(),
)

export const getOpsSnapshot = createServerFn({ method: 'GET' }).handler(async (): Promise<OpsSnapshot> => {
  await requireGuardian()
  const [magic, allGlitches, echoList, recent, [gc]] = await Promise.all([
    computeMagicLevel(),
    listGlitches(),
    listEchoes(),
    db.select().from(sensorReadings).orderBy(desc(sensorReadings.id)).limit(DISTRICTS.length * 45),
    db.select({ n: count() }).from(guardians).where(ne(guardians.codename, 'Sentinel')),
  ])
  const history = Object.fromEntries(DISTRICTS.map((d) => [d.id, [] as number[]])) as Record<DistrictId, number[]>
  const latestMap = new Map<string, SensorReading>()
  for (const r of recent) {
    const id = r.districtId as DistrictId
    if (!latestMap.has(id)) latestMap.set(id, { districtId: id, magic: r.magic, timestamp: r.timestamp })
    if (history[id] && history[id].length < 40) history[id].unshift(r.magic)
  }
  const latest = DISTRICTS.map((d) => latestMap.get(d.id) ?? { districtId: d.id, magic: 100, timestamp: new Date().toISOString() })
  return {
    magic,
    latest,
    history,
    glitches: allGlitches.filter((g) => g.status !== 'FIXED'),
    // Photos can be large data URLs; the big screen doesn't show them.
    echoes: echoList.slice(0, 40).map((e) => ({ ...e, imageUrl: null })),
    sim: getSimulatorState(),
    lockdown: getLockdown(),
    guardianCount: gc?.n ?? 0,
  }
})

export const simStart = createServerFn({ method: 'POST' }).handler(async (): Promise<SimulatorState> => {
  await requireCommander()
  startSimulator()
  return getSimulatorState()
})

export const simStop = createServerFn({ method: 'POST' }).handler(async (): Promise<SimulatorState> => {
  await requireCommander()
  stopSimulator()
  return getSimulatorState()
})

export const simTrigger = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ scenario: z.enum(SCENARIO_IDS as [string, ...string[]]) }).parse(d))
  .handler(async ({ data }): Promise<SimulatorState> => {
    await requireCommander()
    triggerDesync(data.scenario as (typeof SCENARIO_IDS)[number])
    return getSimulatorState()
  })

export const simReset = createServerFn({ method: 'POST' }).handler(async (): Promise<SimulatorState> => {
  await requireCommander()
  await resetDemo()
  return getSimulatorState()
})

export const toggleLockdown = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ active: z.boolean(), reason: z.string().max(200).nullish() }).parse(d))
  .handler(async ({ data }): Promise<{ active: boolean; reason: string | null }> => {
    await requireCommander()
    setLockdown(data.active, data.reason || null)
    return getLockdown()
  })

export const listGuardians = createServerFn({ method: 'GET' }).handler(async (): Promise<GuardianRow[]> => {
  await requireCommander()
  return listGuardiansInternal()
})

export const setGuardianRole = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ guardianId: z.string().min(1), role: z.enum(ROLES) }).parse(d))
  .handler(async ({ data }): Promise<GuardianRow[]> => {
    const me = await requireCommander()
    if (me.guardianId === data.guardianId && data.role !== 'commander') {
      throw new Error('You cannot demote yourself.')
    }
    const [target] = await db.update(guardians).set({ role: data.role }).where(eq(guardians.guardianId, data.guardianId)).returning()
    if (target) {
      publish({
        type: 'toast',
        tone: 'info',
        message: `${target.codename} is now a ${data.role}.`,
      })
    }
    return listGuardiansInternal()
  })

async function listGuardiansInternal(): Promise<GuardianRow[]> {
  return db
    .select({ guardianId: guardians.guardianId, codename: guardians.codename, role: guardians.role, score: guardians.score })
    .from(guardians)
    .where(ne(guardians.codename, 'Sentinel'))
    .orderBy(desc(guardians.score), guardians.codename)
    .limit(500)
}
