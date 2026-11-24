/**
 * @file The Achrona simulator. SERVER-ONLY. State lives on `globalThis` so it survives Vite HMR.
 * Every 3s it writes one `sensor_readings` row per district (calm: 92-100 with noise), publishes
 * `sensor.reading` + `magic.level`, runs the F21 anomaly detector (a district falling >25 points in
 * 30s opens a predictive glitch through `ingestEcho`, reporter = system guardian "Sentinel") and
 * handles lockdown (auto below 40, lifted above 60; commanders can also toggle it by hand).
 * Scenarios ("Clocktower Cascade", "Total Desync") script ~90s of staged district drains,
 * Sentinel echoes and toasts. When a scenario ends the districts heal slowly.
 * Game mode (F33): a sabotaged district (`isSabotaged`) loses `GAME_RULES.sabotageDrainPerTick` every tick and
 * never heals until fixed; `onSimulatorTick()` runs at the end of each tick; `prepareSimulatorForRound()`
 * drops any scenario and resets the sensors to calm.
 * `resetDemo()` restores the seed data (glitches, echoes, scores, readings) and clears lockdown.
 * @exports startSimulator, stopSimulator, prepareSimulatorForRound, getSimulatorState, triggerDesync, resetDemo, setLockdown,
 *   getLockdown, getSentinelId, SCENARIOS, SCENARIO_IDS, ScenarioId, SimulatorState
 * @usedBy src/lib/ops.functions.ts
 */
import { eq, lt } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, glitches, guardians, sensorReadings } from '#/db/schema.ts'
import { DISTRICTS, type DistrictId, type SensorReading } from '#/lib/glitch.ts'
import { publish } from './bus.ts'
import { ingestEcho } from './echo-pipeline.ts'
import { GAME_RULES } from '#/lib/game.ts'
import { isSabotaged, onSimulatorTick } from './game.ts'
import { computeMagicLevel, listGlitches, newId } from './repo.ts'

export const TICK_MS = 3000
const CALM = 96
const LOCKDOWN_ON = 40
const LOCKDOWN_OFF = 60
const SCENARIO_SECONDS = 90
const HEAL_PER_TICK = 3
const ANOMALY_DROP = 25
const ANOMALY_WINDOW_MS = 30_000
const ANOMALY_COOLDOWN_MS = 120_000

type Drain = { d: DistrictId; start: number; end: number; floor: number }
type Beat =
  | { at: number; kind: 'echo'; d: DistrictId; text: string }
  | { at: number; kind: 'toast'; tone: 'info' | 'warning' | 'danger' | 'success'; message: string }
type Scenario = { id: string; name: string; description: string; drains: Drain[]; beats: Beat[] }

export const SCENARIOS = {
  cascade: {
    id: 'cascade',
    name: 'Clocktower Cascade',
    description: 'Time unravels at the Eastern Clock Tower and spreads district by district. A slow-burning, 90s attack.',
    drains: [
      { d: 'clocktower', start: 0, end: 22, floor: 6 },
      { d: 'citadel', start: 18, end: 42, floor: 14 },
      { d: 'archives', start: 32, end: 56, floor: 22 },
      { d: 'market', start: 46, end: 70, floor: 30 },
      { d: 'forest', start: 58, end: 82, floor: 42 },
      { d: 'harbor', start: 66, end: 88, floor: 70 },
    ],
    beats: [
      { at: 0, kind: 'toast', tone: 'warning', message: 'Sentinel: temporal anomaly at the Eastern Clock Tower.' },
      { at: 2, kind: 'echo', d: 'clocktower', text: 'The clock tower bell rang thirteen times and the hands are spinning backwards' },
      { at: 12, kind: 'echo', d: 'clocktower', text: 'Time loop: the same minute keeps repeating around the clock tower square' },
      { at: 24, kind: 'toast', tone: 'danger', message: 'The Cascade is spreading to the Crystal Citadel!' },
      { at: 26, kind: 'echo', d: 'citadel', text: 'Citadel crystals are flickering and going dark, mana gauges collapsing fast' },
      { at: 38, kind: 'echo', d: 'archives', text: 'Archive vault doors open onto empty air and pages are rewriting themselves' },
      { at: 52, kind: 'echo', d: 'market', text: 'Rune Market stalls duplicate and vanish, merchants repeat the same sale over and over' },
      { at: 62, kind: 'toast', tone: 'danger', message: 'Magic critical across Achrona. All guardians report in!' },
      { at: 66, kind: 'echo', d: 'forest', text: 'Whispering Forest trees whisper in reverse and paths loop back on themselves' },
      { at: 80, kind: 'echo', d: 'harbor', text: 'Mistveil Harbor portal flickering between two places, ships appear and disappear' },
      { at: 88, kind: 'toast', tone: 'success', message: 'The Cascade is subsiding. Magic slowly returning.' },
    ],
  },
  desync: {
    id: 'desync',
    name: 'Total Desync',
    description: 'Every district desyncs at once. A violent, 90s attack that trips lockdown within about 30 seconds.',
    drains: [
      { d: 'clocktower', start: 0, end: 14, floor: 5 },
      { d: 'citadel', start: 4, end: 20, floor: 8 },
      { d: 'archives', start: 8, end: 24, floor: 10 },
      { d: 'harbor', start: 12, end: 28, floor: 12 },
      { d: 'market', start: 16, end: 32, floor: 6 },
      { d: 'forest', start: 20, end: 36, floor: 12 },
    ],
    beats: [
      { at: 0, kind: 'toast', tone: 'danger', message: 'DESYNC DETECTED. Achrona is losing sync with reality!' },
      { at: 1, kind: 'echo', d: 'clocktower', text: 'Clock tower bells ringing out of order, time is stuttering' },
      { at: 5, kind: 'echo', d: 'citadel', text: 'Crystal Citadel is draining magic, crystals going dim' },
      { at: 10, kind: 'echo', d: 'archives', text: 'Archive Vaults: scrolls rewriting themselves, memory leaking out of the shelves' },
      { at: 15, kind: 'echo', d: 'harbor', text: 'Portal flicker at Mistveil Harbor, the lighthouse blinks in and out of existence' },
      { at: 19, kind: 'echo', d: 'market', text: 'Rune Market echo storm: every stall hears the same voice repeating' },
      { at: 24, kind: 'echo', d: 'forest', text: 'Reality tear in the Whispering Forest, a hole in the sky above the trees' },
      { at: 30, kind: 'toast', tone: 'danger', message: 'Magic level critical. Lockdown protocols engaged.' },
      { at: 36, kind: 'echo', d: 'clocktower', text: 'Clock tower time loop again, pigeons passing the same window every few seconds' },
      { at: 46, kind: 'echo', d: 'citadel', text: 'Citadel magic drain getting worse, mana gauges near zero' },
      { at: 58, kind: 'echo', d: 'market', text: 'Rune Market memory leak, shopkeepers forgetting what they sell' },
      { at: 72, kind: 'toast', tone: 'warning', message: 'Sentinel: desync wave weakening. Hold the line!' },
      { at: 88, kind: 'toast', tone: 'success', message: 'The Desync is over. Time to heal Achrona.' },
    ],
  },
} as const satisfies Record<string, Scenario>

export type ScenarioId = keyof typeof SCENARIOS
export const SCENARIO_IDS = Object.keys(SCENARIOS) as ScenarioId[]

export type SimulatorState = {
  running: boolean
  phase: 'calm' | 'attack' | 'recovering'
  scenario: { id: ScenarioId; name: string; startedAt: string; elapsedMs: number; durationMs: number } | null
  tickMs: number
  scenarios: { id: ScenarioId; name: string; description: string }[]
}

type Sim = {
  timer: ReturnType<typeof setInterval> | null
  ticking: boolean
  tick: number
  scenario: { id: ScenarioId; startedAt: number; fired: Set<number>; done: boolean } | null
  level: Record<string, number>
  history: Record<string, { t: number; m: number }[]>
  alertedAt: Record<string, number>
  lockdown: { active: boolean; reason: string | null; auto: boolean }
  suppressAuto: boolean
  sentinelId: string | null
}

const g = globalThis as unknown as { __ggSim?: Sim }
const sim: Sim = (g.__ggSim ??= {
  timer: null,
  ticking: false,
  tick: 0,
  scenario: null,
  level: {},
  history: {},
  alertedAt: {},
  lockdown: { active: false, reason: null, auto: false },
  suppressAuto: false,
  sentinelId: null,
})

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const jitter = (amp: number) => (Math.random() * 2 - 1) * amp
const smooth = (x: number) => {
  const t = clamp(x, 0, 1)
  return t * t * (3 - 2 * t)
}
const districtName = (id: string) => DISTRICTS.find((d) => d.id === id)?.name ?? id

/** The system guardian that files scripted and predictive echoes. Created on demand. */
export async function getSentinelId(): Promise<string> {
  if (sim.sentinelId) return sim.sentinelId
  const [row] = await db.select({ id: guardians.guardianId }).from(guardians).where(eq(guardians.codename, 'Sentinel')).limit(1)
  if (row) return (sim.sentinelId = row.id)
  const id = newId('GD')
  await db
    .insert(guardians)
    .values({ guardianId: id, codename: 'Sentinel', role: 'defender', passwordHash: null, score: 0, createdAt: new Date().toISOString() })
    .onConflictDoNothing()
  const [created] = await db.select({ id: guardians.guardianId }).from(guardians).where(eq(guardians.codename, 'Sentinel')).limit(1)
  return (sim.sentinelId = created?.id ?? id)
}

/* ------------------------------ lockdown ------------------------------ */

export function getLockdown(): { active: boolean; reason: string | null } {
  return { active: sim.lockdown.active, reason: sim.lockdown.reason }
}

/** Manual (commander) lockdown switch. Lifting by hand silences auto-lockdown until magic recovers. */
export function setLockdown(active: boolean, reason?: string | null, auto = false): void {
  sim.lockdown = { active, reason: active ? (reason ?? (auto ? 'Magic level critical' : 'Commander ordered lockdown')) : null, auto: active && auto }
  if (!auto) sim.suppressAuto = !active
  publish({ type: 'lockdown', active, reason: sim.lockdown.reason })
  publish({
    type: 'toast',
    tone: active ? 'danger' : 'success',
    message: active ? `LOCKDOWN: ${sim.lockdown.reason}` : 'Lockdown lifted. Achrona is stabilising.',
  })
}

/* ------------------------------ state ------------------------------ */

export function getSimulatorState(): SimulatorState {
  const sc = sim.scenario
  const def = sc ? SCENARIOS[sc.id] : null
  const recovering = !sc && DISTRICTS.some((d) => (sim.level[d.id] ?? CALM) < CALM - 6)
  return {
    running: sim.timer !== null,
    phase: sc && !sc.done ? 'attack' : sc?.done || recovering ? 'recovering' : 'calm',
    scenario:
      sc && def
        ? { id: sc.id, name: def.name, startedAt: new Date(sc.startedAt).toISOString(), elapsedMs: Date.now() - sc.startedAt, durationMs: SCENARIO_SECONDS * 1000 }
        : null,
    tickMs: TICK_MS,
    scenarios: SCENARIO_IDS.map((id) => ({ id, name: SCENARIOS[id].name, description: SCENARIOS[id].description })),
  }
}

export function startSimulator(): void {
  if (sim.timer) return
  sim.timer = setInterval(() => void runTick(), TICK_MS)
  void runTick()
  publish({ type: 'toast', tone: 'info', message: 'Sensor grid online. Simulator started.' })
}

export function stopSimulator(): void {
  if (sim.timer) clearInterval(sim.timer)
  sim.timer = null
  publish({ type: 'toast', tone: 'info', message: 'Simulator paused.' })
}

/** Game start: drop any running scenario and put every district back to calm (published immediately). */
export async function prepareSimulatorForRound(): Promise<void> {
  sim.scenario = null
  sim.alertedAt = {}
  sim.history = {}
  sim.suppressAuto = false
  const iso = new Date().toISOString()
  const rows: SensorReading[] = DISTRICTS.map((d) => {
    const m = Math.round((CALM + jitter(2)) * 10) / 10
    sim.level[d.id] = m
    return { districtId: d.id, magic: m, timestamp: iso }
  })
  await db.insert(sensorReadings).values(rows)
  for (const reading of rows) publish({ type: 'sensor.reading', reading })
  publish({ type: 'magic.level', level: await computeMagicLevel() })
  if (sim.lockdown.active) setLockdown(false)
}

export function triggerDesync(scenario: ScenarioId = 'desync'): void {
  if (!SCENARIOS[scenario]) throw new Error(`Unknown scenario: ${scenario}`)
  sim.scenario = { id: scenario, startedAt: Date.now(), fired: new Set(), done: false }
  sim.suppressAuto = false
  if (!sim.timer) startSimulator()
  else void runTick()
}

/* ------------------------------ tick ------------------------------ */

async function loadLevels(): Promise<void> {
  if (Object.keys(sim.level).length) return
  const rows = await db.select().from(sensorReadings).orderBy(sensorReadings.id)
  for (const r of rows) sim.level[r.districtId] = r.magic
  for (const d of DISTRICTS) sim.level[d.id] ??= CALM
}

function scenarioTarget(id: ScenarioId, d: DistrictId, t: number): number | null {
  const drain = SCENARIOS[id].drains.find((x) => x.d === d)
  if (!drain || t < drain.start) return null
  return CALM - (CALM - drain.floor) * smooth((t - drain.start) / (drain.end - drain.start))
}

async function runTick(): Promise<void> {
  if (sim.ticking) return
  sim.ticking = true
  try {
    await loadLevels()
    sim.tick++
    const now = Date.now()
    const iso = new Date(now).toISOString()
    const sc = sim.scenario
    const t = sc && !sc.done ? (now - sc.startedAt) / 1000 : 0

    const rows: SensorReading[] = DISTRICTS.map((d) => {
      const cur = sim.level[d.id] ?? CALM
      const target = sc && !sc.done ? scenarioTarget(sc.id, d.id, t) : null
      let next: number
      if (target !== null) {
        // Under attack: follow the scripted curve with a nervous wobble.
        next = target + jitter(2.5)
      } else if (sc && !sc.done) {
        next = CALM + jitter(2)
      } else {
        // Calm or healing: climb back slowly, then idle at 92-100.
        const goal = CALM + jitter(3)
        next = cur < goal - 4 ? cur + HEAL_PER_TICK + jitter(0.8) : goal
      }
      // Game mode: an unfixed sabotage drains the district every tick and blocks healing.
      if (isSabotaged(d.id)) next = Math.min(next, cur) - GAME_RULES.sabotageDrainPerTick
      next = clamp(next, 0, 100)
      sim.level[d.id] = next
      const h = (sim.history[d.id] ??= [])
      h.push({ t: now, m: next })
      while (h.length && now - h[0].t > 60_000) h.shift()
      return { districtId: d.id, magic: Math.round(next * 10) / 10, timestamp: iso }
    })

    await db.insert(sensorReadings).values(rows)
    for (const reading of rows) publish({ type: 'sensor.reading', reading })

    if (sim.tick % 20 === 0) {
      const cutoff = new Date(now - 30 * 60_000).toISOString()
      await db.delete(sensorReadings).where(lt(sensorReadings.timestamp, cutoff))
    }

    // Scenario script + end of attack.
    if (sc && !sc.done) {
      const beats = SCENARIOS[sc.id].beats as readonly Beat[]
      beats.forEach((b, i) => {
        if (b.at <= t && !sc.fired.has(i)) {
          sc.fired.add(i)
          if (b.kind === 'toast') publish({ type: 'toast', tone: b.tone, message: b.message })
          else void sentinelEcho(b.text, b.d)
        }
      })
      if (t >= SCENARIO_SECONDS) {
        sc.done = true
        sim.scenario = null
      }
    }

    detectAnomalies(now)

    const level = await computeMagicLevel()
    publish({ type: 'magic.level', level })
    updateLockdown(level)
    await onSimulatorTick()
  } catch (err) {
    console.error('[simulator] tick failed', err)
  } finally {
    sim.ticking = false
  }
}

function updateLockdown(level: number): void {
  if (level >= LOCKDOWN_OFF) sim.suppressAuto = false
  if (!sim.lockdown.active && !sim.suppressAuto && level < LOCKDOWN_ON) {
    setLockdown(true, 'Magic level critical', true) // no number: it would freeze while the live gauge keeps moving
  } else if (sim.lockdown.active && sim.lockdown.auto && level > LOCKDOWN_OFF) {
    setLockdown(false)
  }
}

async function sentinelEcho(text: string, districtId: DistrictId): Promise<void> {
  try {
    await ingestEcho({ description: text, districtId, guardianId: await getSentinelId() })
  } catch (err) {
    console.error('[simulator] scripted echo failed', err)
  }
}

/** F21: a district that loses >25 points within 30s opens a predictive glitch. */
function detectAnomalies(now: number): void {
  for (const d of DISTRICTS) {
    const h = sim.history[d.id] ?? []
    const window = h.filter((p) => now - p.t <= ANOMALY_WINDOW_MS)
    if (window.length < 2) continue
    const drop = Math.max(...window.map((p) => p.m)) - window[window.length - 1].m
    if (drop > ANOMALY_DROP && now - (sim.alertedAt[d.id] ?? 0) > ANOMALY_COOLDOWN_MS) {
      sim.alertedAt[d.id] = now
      void sentinelEcho(
        `Predictive alert: ${districtName(d.id)} magic dropped ${Math.round(drop)} points in 30 seconds, sensors predict an imminent glitch`,
        d.id,
      )
    }
  }
}

/* ------------------------------ reset ------------------------------ */

const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
const H = 3_600_000

/** Seed glitches/echoes (mirrors src/db/seed.ts, re-timed to "now" so the demo looks fresh). */
function seedRows() {
  const glitchRows: (typeof glitches.$inferInsert)[] = [
    { glitchId: 'GL-0142', status: 'LEAKED', description: 'Time loop detected near the eastern clock tower', timestamp: ago(2 * H), type: 'TIME_LOOP', severity: 'high', districtId: 'clocktower', updatedAt: ago(2 * H) },
    { glitchId: 'GL-0141', status: 'ASSESSING', description: 'Magic reserves dropping faster than expected', timestamp: ago(5 * H), type: 'MAGIC_DRAIN', severity: 'medium', districtId: 'citadel', assigneeId: 'GD-0002', updatedAt: ago(5 * H) },
    { glitchId: 'GL-0139', status: 'CONTAINING', description: 'Portal flicker in the archive vaults', timestamp: ago(18 * H), type: 'PORTAL_FLICKER', severity: 'medium', districtId: 'archives', assigneeId: 'GD-0003', updatedAt: ago(18 * H) },
    { glitchId: 'GL-0137', status: 'FIXED', description: 'Echo sensors reporting duplicate signals', timestamp: ago(40 * H), type: 'ECHO_STORM', severity: 'low', districtId: 'harbor', updatedAt: ago(40 * H) },
  ]
  const echoRows: (typeof echoes.$inferInsert)[] = [
    { echoId: 'EC-0001', glitchId: 'GL-0142', description: 'The clock tower bell rang 12 times... three times in a row', timestamp: ago(2 * H), reportingGuardianId: 'GD-0002', districtId: 'clocktower' },
    { echoId: 'EC-0002', glitchId: 'GL-0142', description: 'Same pigeons flying past the tower every minute', timestamp: ago(2 * H - 8 * 60_000), reportingGuardianId: 'GD-0003', districtId: 'clocktower' },
    { echoId: 'EC-0003', glitchId: 'GL-0141', description: 'Citadel crystals dimming, mana gauges at 60%', timestamp: ago(5 * H), reportingGuardianId: 'GD-0002', districtId: 'citadel' },
    { echoId: 'EC-0004', glitchId: 'GL-0139', description: 'Vault door 7 opens into the harbor for a split second', timestamp: ago(18 * H), reportingGuardianId: 'GD-0003', districtId: 'archives' },
    { echoId: 'EC-0005', glitchId: 'GL-0137', description: 'Harbor sensors double-reporting, fixed after recalibration', timestamp: ago(40 * H), reportingGuardianId: 'GD-0002', districtId: 'harbor' },
  ]
  return { glitchRows, echoRows }
}

/** Restore the seed state: no attack, no lockdown, seed glitches/echoes, healthy sensors, fresh scores. */
export async function resetDemo(): Promise<void> {
  sim.scenario = null
  sim.alertedAt = {}
  sim.history = {}
  sim.suppressAuto = false
  const sentinel = await getSentinelId()
  const { glitchRows, echoRows } = seedRows()

  const known = new Set((await db.select({ id: guardians.guardianId }).from(guardians)).map((r) => r.id))
  const glitchesFixed = glitchRows.map((r) => ({ ...r, assigneeId: r.assigneeId && known.has(r.assigneeId) ? r.assigneeId : null }))
  const echoesFixed = echoRows.map((r) => ({ ...r, reportingGuardianId: known.has(r.reportingGuardianId) ? r.reportingGuardianId : sentinel }))

  const now = Date.now()
  const readings: (typeof sensorReadings.$inferInsert)[] = []
  const levels: Record<string, number> = {}
  for (const d of DISTRICTS) {
    for (let i = 20; i >= 0; i--) {
      const m = Math.round((CALM + jitter(3)) * 10) / 10
      readings.push({ districtId: d.id, magic: m, timestamp: new Date(now - i * TICK_MS).toISOString() })
      levels[d.id] = m
    }
  }
  sim.level = levels

  await db.transaction(async (tx) => {
    await tx.delete(echoes)
    await tx.delete(glitches)
    await tx.delete(sensorReadings)
    await tx.insert(glitches).values(glitchesFixed)
    await tx.insert(echoes).values(echoesFixed)
    await tx.insert(sensorReadings).values(readings)
    await tx.update(guardians).set({ score: 0 })
    const scores: [string, number][] = [['GD-0001', 42], ['GD-0002', 27], ['GD-0003', 15]]
    for (const [id, score] of scores) await tx.update(guardians).set({ score }).where(eq(guardians.guardianId, id))
  })

  if (sim.lockdown.active) setLockdown(false)
  else sim.lockdown = { active: false, reason: null, auto: false }
  sim.suppressAuto = false

  for (const r of readings.slice(-DISTRICTS.length)) {
    publish({ type: 'sensor.reading', reading: { districtId: r.districtId as DistrictId, magic: r.magic, timestamp: r.timestamp } })
  }
  for (const gl of await listGlitches()) publish({ type: 'glitch.updated', glitch: gl })
  publish({ type: 'magic.level', level: await computeMagicLevel() })
  publish({ type: 'toast', tone: 'success', message: 'Demo reset. Achrona is calm again.' })
}
