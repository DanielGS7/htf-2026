/**
 * @file "Desync Protocol" game engine (F33). SERVER-ONLY. In-memory state on globalThis (single process,
 * survives Vite HMR). Every state change publishes `game.state`; the public state never names the Desync
 * before `phase === 'ended'`. A 1s engine timer closes meetings and ends the round; the simulator tick
 * (3s) applies the sabotage drain (via `isSabotaged`) and calls `onSimulatorTick` for win checks.
 * Sabotage glitches are real glitch rows with `hidden = true, sabotage = true`; they are created silently
 * (no glitch events) and revealed by `echo-pipeline.ts` when a report matches them.
 * @exports getPublicState, getPlayerView, listCrewCandidates, setup, start, stop, sabotage, listFixable,
 *   completeFix, callMeeting, castVote, isSabotaged, isGameActive, activeHiddenSabotageIds,
 *   onSimulatorTick, onEchoMatchedHidden
 * @usedBy src/lib/game.functions.ts, src/server/simulator.ts, src/server/echo-pipeline.ts
 */
import { randomInt } from 'node:crypto'
import { and, desc, eq, inArray, isNotNull, ne } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { glitches, guardians } from '#/db/schema.ts'
import { DISTRICTS, type DistrictId, type GlitchType } from '#/lib/glitch.ts'
import {
  GAME_RULES,
  IDLE_GAME_STATE,
  type ActiveSabotage,
  type FixableGlitch,
  type MeetingResult,
  type MyGameView,
  type PublicGameState,
} from '#/lib/game.ts'
import { publish } from './bus.ts'
import { addScore } from './echo-pipeline.ts'
import { computeMagicLevel, getGlitch, newId } from './repo.ts'
import { prepareSimulatorForRound, startSimulator } from './simulator.ts'

type SabRec = { glitchId: string; districtId: DistrictId; type: GlitchType; startedAt: string; discovered: boolean; fixed: boolean }

type Engine = {
  pub: PublicGameState
  desyncId: string | null
  sabs: SabRec[]
  lastSabotageAt: number
  /** When the last meeting finished (cooldown reference); 0 = none yet. */
  lastMeetingEndedAt: number
  meetingStartedAt: number
  resultUntil: number
  votes: Map<string, string>
  active: Set<string>
  timer: ReturnType<typeof setInterval> | null
  busy: boolean
}

const g = globalThis as unknown as { __ggGame?: Engine }
const E: Engine = (g.__ggGame ??= {
  pub: { ...IDLE_GAME_STATE },
  desyncId: null,
  sabs: [],
  lastSabotageAt: 0,
  lastMeetingEndedAt: 0,
  meetingStartedAt: 0,
  resultUntil: 0,
  votes: new Map(),
  active: new Set(),
  timer: null,
  busy: false,
})

const districtName = (id: string) => DISTRICTS.find((d) => d.id === id)?.name ?? id

const SABOTAGE_TEXT: Record<GlitchType, (d: string) => string> = {
  TIME_LOOP: (d) => `Time loop: the same minute keeps repeating around ${d}`,
  MAGIC_DRAIN: (d) => `Magic drain: mana reserves at ${d} are bleeding away fast`,
  PORTAL_FLICKER: (d) => `Portal flicker: gates at ${d} blink open and shut`,
  ECHO_STORM: (d) => `Echo storm: duplicate signals and noise flooding ${d}`,
  MEMORY_LEAK: (d) => `Memory leak: people at ${d} are forgetting what they were doing`,
  REALITY_TEAR: (d) => `Reality tear: a rift is opening above ${d}`,
  UNKNOWN: (d) => `Strange anomaly spreading through ${d}`,
}

/* ------------------------------ state helpers ------------------------------ */

const inRound = () => E.pub.phase === 'playing' || E.pub.phase === 'meeting'

/** True while a round is running (playing or meeting). */
export function isGameActive(): boolean {
  return inRound()
}

/** Glitch ids of this round's still-hidden sabotages (echo triage may match them). */
export function activeHiddenSabotageIds(): Set<string> {
  return new Set(inRound() ? E.sabs.filter((s) => !s.discovered).map((s) => s.glitchId) : [])
}

/** For the simulator: does this district have an unfixed sabotage right now? */
export function isSabotaged(districtId: DistrictId): boolean {
  return inRound() && E.sabs.some((s) => s.districtId === districtId && !s.fixed)
}

/** Rebuild counts, publish the public state. Never leaks the Desync before the end. */
function commit(): PublicGameState {
  E.pub.hiddenSabotages = E.sabs.filter((s) => !s.discovered).length
  E.pub.discoveredSabotages = E.sabs.filter((s) => s.discovered).length
  E.pub.fixedSabotages = E.sabs.filter((s) => s.fixed).length
  const snapshot = structuredClone(E.pub)
  publish({ type: 'game.state', state: snapshot })
  return snapshot
}

const toast = (tone: 'info' | 'warning' | 'danger' | 'success', message: string) => publish({ type: 'toast', tone, message })

function ensureTimer(): void {
  if (E.timer) return
  E.timer = setInterval(() => void step(), 1000)
}
function clearTimer(): void {
  if (E.timer) clearInterval(E.timer)
  E.timer = null
}

function activePlayerIds(): Set<string> {
  const ids = new Set(E.active)
  for (const c of E.pub.crew) ids.add(c.guardianId)
  for (const c of E.pub.crew) if (c.ejected) ids.delete(c.guardianId)
  return ids
}

async function codenameOf(id: string): Promise<string | null> {
  const [row] = await db.select({ c: guardians.codename }).from(guardians).where(eq(guardians.guardianId, id)).limit(1)
  return row?.c ?? null
}

/* ------------------------------ lifecycle ------------------------------ */

export function getPublicState(): PublicGameState {
  return structuredClone(E.pub)
}

export async function listCrewCandidates(): Promise<{ guardianId: string; codename: string; role: string }[]> {
  const rows = await db
    .select({ guardianId: guardians.guardianId, codename: guardians.codename, role: guardians.role })
    .from(guardians)
    .where(and(isNotNull(guardians.passwordHash), ne(guardians.codename, 'Sentinel')))
    .orderBy(guardians.codename)
  return rows
}

export async function setup(crewIds: string[], roundMs: number): Promise<PublicGameState> {
  if (inRound()) throw new Error('A round is running; stop it first')
  const ids = [...new Set(crewIds)]
  const rows = await db.select({ id: guardians.guardianId, codename: guardians.codename }).from(guardians).where(inArray(guardians.guardianId, ids))
  if (rows.length !== ids.length) throw new Error('Unknown crew member')
  clearTimer()
  E.desyncId = null
  E.sabs = []
  E.votes = new Map()
  E.active = new Set()
  E.pub = {
    ...IDLE_GAME_STATE,
    phase: 'lobby',
    crew: ids.map((id) => ({ guardianId: id, codename: rows.find((r) => r.id === id)!.codename, ejected: false })),
    roundMs,
  }
  return commit()
}

export async function start(): Promise<PublicGameState> {
  if (E.pub.phase !== 'lobby') throw new Error('Set up the crew first (lobby)')
  const crew = E.pub.crew
  E.desyncId = crew[randomInt(crew.length)]!.guardianId
  E.sabs = []
  E.votes = new Map()
  E.active = new Set(crew.map((c) => c.guardianId))
  E.lastSabotageAt = 0
  E.lastMeetingEndedAt = 0
  E.pub = {
    ...E.pub,
    phase: 'playing',
    roundEndsAt: new Date(Date.now() + E.pub.roundMs).toISOString(),
    meeting: null,
    meetingsLeft: GAME_RULES.meetingsPerRound,
    winner: null,
    endReason: null,
    desyncId: null,
    desyncCodename: null,
  }
  await prepareSimulatorForRound()
  startSimulator()
  ensureTimer()
  toast('warning', 'Desync Protocol: the round has begun. One of the crew is the Desync.')
  return commit()
}

export async function stop(): Promise<PublicGameState> {
  clearTimer()
  E.desyncId = null
  E.sabs = []
  E.votes = new Map()
  E.active = new Set()
  E.pub = { ...IDLE_GAME_STATE }
  return commit()
}

async function endGame(winner: 'defenders' | 'desync', reason: string): Promise<void> {
  if (E.pub.phase === 'ended' || E.pub.phase === 'idle') return
  clearTimer()
  E.pub = {
    ...E.pub,
    phase: 'ended',
    meeting: null,
    roundEndsAt: null,
    winner,
    endReason: reason,
    desyncId: E.desyncId,
    desyncCodename: E.desyncId ? await codenameOf(E.desyncId) : null,
  }
  toast(winner === 'defenders' ? 'success' : 'danger', winner === 'defenders' ? `Defenders win: ${reason}` : `The Desync wins: ${reason}`)
  commit()
}

/* ------------------------------ sabotage ------------------------------ */

function cooldownUntil(): string | null {
  const t = E.lastSabotageAt + GAME_RULES.sabotageCooldownMs
  return E.lastSabotageAt && t > Date.now() ? new Date(t).toISOString() : null
}

export async function sabotage(guardianId: string, districtId: DistrictId, type: GlitchType): Promise<MyGameView> {
  if (E.pub.phase !== 'playing') throw new Error('No round in progress')
  if (guardianId !== E.desyncId) throw new Error('Not allowed')
  if (cooldownUntil()) throw new Error('Sabotage is on cooldown')
  if (isSabotaged(districtId)) throw new Error('That district is already sabotaged')
  const now = new Date().toISOString()
  const glitchId = newId('GL')
  await db.insert(glitches).values({
    glitchId,
    status: 'LEAKED',
    description: SABOTAGE_TEXT[type](districtName(districtId)),
    timestamp: now,
    type,
    severity: 'high',
    districtId,
    updatedAt: now,
    hidden: true,
    sabotage: true,
  })
  E.sabs.push({ glitchId, districtId, type, startedAt: now, discovered: false, fixed: false })
  E.lastSabotageAt = Date.now()
  commit()
  return getPlayerView(guardianId)
}

/** Sync discovered/fixed flags with the DB (commander can also FIX a glitch by hand). */
async function refreshSabotages(): Promise<boolean> {
  if (!E.sabs.length) return false
  const rows = await db
    .select({ id: glitches.glitchId, hidden: glitches.hidden, status: glitches.status })
    .from(glitches)
    .where(inArray(glitches.glitchId, E.sabs.map((s) => s.glitchId)))
  let changed = false
  for (const s of E.sabs) {
    const r = rows.find((x) => x.id === s.glitchId)
    if (!r) continue
    const discovered = !r.hidden
    const fixed = r.status === 'FIXED'
    if (discovered !== s.discovered || fixed !== s.fixed) {
      s.discovered = discovered
      s.fixed = fixed
      changed = true
    }
  }
  return changed
}

/* ------------------------------ discovery + fixing ------------------------------ */

/** Called by the echo pipeline AFTER it set `hidden = false`: points, "DISCOVERED" event, state. */
export async function onEchoMatchedHidden(glitchId: string, reporterId: string): Promise<void> {
  const rec = E.sabs.find((s) => s.glitchId === glitchId)
  if (rec) rec.discovered = true
  await addScore(reporterId, GAME_RULES.points.discover)
  const glitch = await getGlitch(glitchId)
  if (glitch) publish({ type: 'game.discovered', glitch, byCodename: await codenameOf(reporterId) })
  commit()
}

export async function listFixable(): Promise<FixableGlitch[]> {
  const rows = await db
    .select({
      glitchId: glitches.glitchId,
      description: glitches.description,
      type: glitches.type,
      severity: glitches.severity,
      districtId: glitches.districtId,
      sabotage: glitches.sabotage,
    })
    .from(glitches)
    .where(and(eq(glitches.hidden, false), ne(glitches.status, 'FIXED')))
    .orderBy(desc(glitches.sabotage), desc(glitches.timestamp))
    .limit(12)
  return rows.map((r) => ({ ...r, districtId: r.districtId as DistrictId | null }))
}

export async function completeFix(guardianId: string, glitchId: string): Promise<{ ok: true; points: number }> {
  const [row] = await db
    .select({ status: glitches.status, hidden: glitches.hidden })
    .from(glitches)
    .where(eq(glitches.glitchId, glitchId))
    .limit(1)
  if (!row || row.hidden) throw new Error('Unknown glitch')
  if (row.status === 'FIXED') throw new Error('Already fixed')
  // The Desync's "fix" is a fake task: same UI, no effect.
  if (inRound() && guardianId === E.desyncId) return { ok: true, points: 0 }
  await db.update(glitches).set({ status: 'FIXED', updatedAt: new Date().toISOString() }).where(eq(glitches.glitchId, glitchId))
  await addScore(guardianId, GAME_RULES.points.fix)
  const glitch = await getGlitch(glitchId)
  if (glitch) publish({ type: 'glitch.updated', glitch })
  publish({ type: 'magic.level', level: await computeMagicLevel() })
  if (await refreshSabotages()) commit()
  return { ok: true, points: GAME_RULES.points.fix }
}

/* ------------------------------ meetings ------------------------------ */

function canCall(id: string): boolean {
  if (E.pub.phase !== 'playing' || E.pub.meetingsLeft <= 0) return false
  if (E.pub.crew.some((c) => c.guardianId === id && c.ejected)) return false
  return !E.lastMeetingEndedAt || Date.now() - E.lastMeetingEndedAt >= GAME_RULES.meetingCooldownMs
}

export async function callMeeting(guardianId: string): Promise<PublicGameState> {
  if (E.pub.phase !== 'playing') throw new Error('No round in progress')
  if (!canCall(guardianId)) throw new Error('You cannot call a meeting right now')
  const now = Date.now()
  E.active.add(guardianId)
  E.votes = new Map()
  E.meetingStartedAt = now
  E.pub = {
    ...E.pub,
    phase: 'meeting',
    meetingsLeft: E.pub.meetingsLeft - 1,
    meeting: {
      calledById: guardianId,
      calledByCodename: (await codenameOf(guardianId)) ?? 'Someone',
      endsAt: new Date(now + GAME_RULES.meetingMs).toISOString(),
      tally: {},
      votesCast: 0,
      result: null,
    },
  }
  toast('warning', `Emergency meeting called by ${E.pub.meeting!.calledByCodename}!`)
  return commit()
}

export async function castVote(guardianId: string, suspectId: string): Promise<MyGameView> {
  const m = E.pub.meeting
  if (E.pub.phase !== 'meeting' || !m || m.result) throw new Error('No vote in progress')
  if (E.pub.crew.some((c) => c.guardianId === guardianId && c.ejected)) throw new Error('Ejected players cannot vote')
  if (suspectId !== 'skip' && !E.pub.crew.some((c) => c.guardianId === suspectId && !c.ejected)) throw new Error('Not a valid suspect')
  E.active.add(guardianId)
  E.votes.set(guardianId, suspectId)
  const tally: Record<string, number> = {}
  for (const v of E.votes.values()) tally[v] = (tally[v] ?? 0) + 1
  m.tally = tally
  m.votesCast = E.votes.size
  commit()
  if ([...activePlayerIds()].every((id) => E.votes.has(id))) closeMeeting()
  return getPlayerView(guardianId)
}

function closeMeeting(): void {
  const m = E.pub.meeting
  if (E.pub.phase !== 'meeting' || !m || m.result) return
  const entries = Object.entries(m.tally).sort((a, b) => b[1] - a[1])
  const top = entries[0]
  const tie = entries.length > 1 && entries[1]![1] === top?.[1]
  let result: MeetingResult = { ejectedId: null, ejectedCodename: null, wasDesync: null }
  if (top && top[0] !== 'skip' && !tie) {
    const crew = E.pub.crew.find((c) => c.guardianId === top[0])!
    crew.ejected = true
    result = { ejectedId: crew.guardianId, ejectedCodename: crew.codename, wasDesync: crew.guardianId === E.desyncId }
  }
  m.result = result
  E.resultUntil = Date.now() + GAME_RULES.meetingResultMs
  toast(
    result.wasDesync ? 'success' : result.ejectedId ? 'danger' : 'info',
    result.ejectedId ? `${result.ejectedCodename} was ${result.wasDesync ? '' : 'not '}the Desync.` : 'Nobody was ejected.',
  )
  commit()
}

async function finalizeMeeting(): Promise<void> {
  const m = E.pub.meeting
  if (E.pub.phase !== 'meeting' || !m?.result) return
  const now = Date.now()
  const pausedFor = now - E.meetingStartedAt
  const result = m.result
  E.lastMeetingEndedAt = now
  E.votes = new Map()
  E.pub = {
    ...E.pub,
    phase: 'playing',
    meeting: null,
    roundEndsAt: E.pub.roundEndsAt ? new Date(new Date(E.pub.roundEndsAt).getTime() + pausedFor).toISOString() : null,
  }
  if (result.wasDesync) return endGame('defenders', 'The Desync was ejected')
  if (result.ejectedId && E.pub.crew.filter((c) => c.guardianId !== E.desyncId && !c.ejected).length <= 1) {
    return endGame('desync', 'Only one defender is left in the crew')
  }
  commit()
}

/* ------------------------------ loop ------------------------------ */

async function checkMagic(): Promise<void> {
  if (!inRound()) return
  if ((await computeMagicLevel()) <= 0) await endGame('desync', 'Achrona ran out of magic')
}

async function step(): Promise<void> {
  if (E.busy) return
  E.busy = true
  try {
    const now = Date.now()
    if (E.pub.phase === 'playing' && E.pub.roundEndsAt && now >= new Date(E.pub.roundEndsAt).getTime()) {
      if ((await computeMagicLevel()) > 0) await endGame('defenders', 'Time ran out and Achrona still has magic')
      else await endGame('desync', 'Achrona ran out of magic')
    } else if (E.pub.phase === 'meeting' && E.pub.meeting) {
      if (!E.pub.meeting.result && now >= new Date(E.pub.meeting.endsAt).getTime()) closeMeeting()
      else if (E.pub.meeting.result && now >= E.resultUntil) await finalizeMeeting()
    }
  } catch (err) {
    console.error('[game] step failed', err)
  } finally {
    E.busy = false
  }
}

/** Called by the simulator every tick (after drain + readings): sync sabotage state, check win/timer. */
export async function onSimulatorTick(): Promise<void> {
  if (!inRound()) return
  if (await refreshSabotages()) commit()
  await checkMagic()
  await step()
}

/* ------------------------------ player view ------------------------------ */

export async function getPlayerView(guardianId: string): Promise<MyGameView> {
  const ph = E.pub.phase
  const showRole = ph === 'playing' || ph === 'meeting' || ph === 'ended'
  if (inRound()) E.active.add(guardianId)
  const isDesync = showRole && guardianId === E.desyncId
  const crewMember = E.pub.crew.find((c) => c.guardianId === guardianId)
  const sabotages: ActiveSabotage[] = isDesync
    ? E.sabs.map((s) => ({ glitchId: s.glitchId, districtId: s.districtId, type: s.type, startedAt: s.startedAt, discovered: s.discovered }))
    : []
  return {
    role: showRole ? (isDesync ? 'desync' : 'defender') : null,
    isCrew: Boolean(crewMember),
    ejected: Boolean(crewMember?.ejected),
    canCallMeeting: canCall(guardianId),
    myVote: ph === 'meeting' ? (E.votes.get(guardianId) ?? null) : null,
    sabotageCooldownUntil: isDesync && ph === 'playing' ? cooldownUntil() : null,
    sabotages,
  }
}
