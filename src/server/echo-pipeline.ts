/**
 * @file The heart of the app: turn a raw echo into glitch state. SERVER-ONLY.
 * Flow: AI triage -> moderation (reject) -> attach to matching glitch OR open a
 * new LEAKED glitch -> auto-close when the echo says "resolved" -> reopen FIXED
 * glitches on a new similar echo -> award points -> publish live events.
 * Game mode (F33): while a round runs, this round's hidden sabotage glitches are triage candidates;
 * a match reveals them (`onEchoMatchedHidden`), and reports about a healthy, unsabotaged district are
 * flagged `unconfirmed`.
 * @exports ingestEcho, addScore, IngestInput, IngestResult
 * @usedBy src/lib/echoes.functions.ts (createEcho), src/server/simulator.ts
 */
import { desc, eq, gt, ne, or, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, glitches, guardians, sensorReadings } from '#/db/schema.ts'
import type { DistrictId, Echo, EchoSource, Glitch } from '#/lib/glitch.ts'
import { triageEcho } from './ai/index.ts'
import { publish } from './bus.ts'
import { activeHiddenSabotageIds, isGameActive, isSabotaged, onEchoMatchedHidden } from './game.ts'
import { computeMagicLevel, getGlitch, newId } from './repo.ts'

export type IngestInput = {
  description: string
  districtId: DistrictId | null
  guardianId: string
  imageUrl?: string | null
  /** 'radio' for walkie-talkie reports from /radio (F31). Default 'app'. */
  source?: EchoSource
}

export type IngestResult = {
  echo: Echo
  glitch: Glitch | null
  /** What happened, for UI feedback. */
  outcome: 'rejected' | 'new-glitch' | 'grouped' | 'resolved' | 'reopened'
}

export const POINTS = { echo: 1, newGlitch: 3, fixed: 10 } as const

export async function ingestEcho(input: IngestInput): Promise<IngestResult> {
  const now = new Date().toISOString()
  const recent = new Date(Date.now() - 30 * 60_000).toISOString()
  const hiddenOk = activeHiddenSabotageIds()
  const candidates = (
    (
    await db
      .select({
        glitchId: glitches.glitchId,
        description: glitches.description,
        type: glitches.type,
        districtId: glitches.districtId,
        status: glitches.status,
        hidden: glitches.hidden,
      })
      .from(glitches)
      .where(or(ne(glitches.status, 'FIXED'), gt(glitches.updatedAt, recent)))
    )
      // Hidden glitches only take part while their game round runs.
      .filter((c) => !c.hidden || hiddenOk.has(c.glitchId))
  ).map(({ hidden: _h, ...c }) => ({ ...c, districtId: c.districtId as DistrictId | null }))
  const hiddenIds = new Set(
    (await db.select({ id: glitches.glitchId }).from(glitches).where(eq(glitches.hidden, true))).map((r) => r.id),
  )

  const t = await triageEcho({ description: input.description, districtId: input.districtId, candidates })
  const districtId = input.districtId ?? t.districtId
  const [reporter] = await db
    .select({ codename: guardians.codename })
    .from(guardians)
    .where(eq(guardians.guardianId, input.guardianId))
    .limit(1)

  const echo: Echo = {
    echoId: newId('EC'),
    glitchId: null,
    description: input.description,
    timestamp: now,
    reportingGuardianId: input.guardianId,
    districtId,
    moderation: t.accept ? 'ok' : 'rejected',
    moderationReason: t.rejectReason,
    imageUrl: input.imageUrl ?? null,
    reporterCodename: reporter?.codename,
    source: input.source ?? 'app',
    flag: null,
  }
  // Game mode: a report about a district that is not sabotaged and whose sensors look healthy.
  if (t.accept && isGameActive() && districtId && !isSabotaged(districtId) && !(t.matchGlitchId && hiddenIds.has(t.matchGlitchId))) {
    const [latest] = await db
      .select({ magic: sensorReadings.magic })
      .from(sensorReadings)
      .where(eq(sensorReadings.districtId, districtId))
      .orderBy(desc(sensorReadings.id))
      .limit(1)
    if (latest && latest.magic >= 80) echo.flag = 'unconfirmed'
  }
  const { reporterCodename: _omit, ...echoRow } = echo

  if (!t.accept) {
    await db.insert(echoes).values(echoRow)
    publish({ type: 'echo.rejected', echo })
    return { echo, glitch: null, outcome: 'rejected' }
  }

  let outcome: IngestResult['outcome']
  let glitchId: string
  const match = t.matchGlitchId ? candidates.find((c) => c.glitchId === t.matchGlitchId) : undefined

  let revealed = false
  if (match) {
    glitchId = match.glitchId
    if (hiddenIds.has(glitchId)) {
      // Discovery: a report found a hidden sabotage. Reveal it (never auto-resolve it from this echo).
      revealed = true
      outcome = 'grouped'
      await db.update(glitches).set({ hidden: false, updatedAt: now }).where(eq(glitches.glitchId, glitchId))
      await onEchoMatchedHidden(glitchId, input.guardianId)
    } else if (t.resolves && match.status !== 'FIXED') {
      outcome = 'resolved'
      await db.update(glitches).set({ status: 'FIXED', updatedAt: now }).where(eq(glitches.glitchId, glitchId))
      await addScore(input.guardianId, POINTS.fixed)
    } else if (!t.resolves && match.status === 'FIXED') {
      outcome = 'reopened'
      await db.update(glitches).set({ status: 'LEAKED', updatedAt: now }).where(eq(glitches.glitchId, glitchId))
    } else {
      outcome = 'grouped'
      await db.update(glitches).set({ updatedAt: now }).where(eq(glitches.glitchId, glitchId))
    }
  } else {
    outcome = 'new-glitch'
    glitchId = newId('GL')
    await db.insert(glitches).values({
      glitchId,
      status: 'LEAKED',
      description: t.title,
      timestamp: now,
      type: t.type,
      severity: t.severity,
      districtId,
      updatedAt: now,
    })
    await addScore(input.guardianId, POINTS.newGlitch)
  }

  echo.glitchId = glitchId
  await db.insert(echoes).values({ ...echoRow, glitchId })
  await addScore(input.guardianId, POINTS.echo)

  const glitch = (await getGlitch(glitchId))!
  publish({ type: 'echo.created', echo })
  publish({ type: outcome === 'new-glitch' || revealed ? 'glitch.created' : 'glitch.updated', glitch })
  publish({ type: 'magic.level', level: await computeMagicLevel() })
  return { echo, glitch, outcome }
}

export async function addScore(guardianId: string, points: number): Promise<void> {
  await db
    .update(guardians)
    .set({ score: sql`${guardians.score} + ${points}` })
    .where(eq(guardians.guardianId, guardianId))
}
