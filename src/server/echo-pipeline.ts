/**
 * @file The heart of the app: turn a raw echo into glitch state. SERVER-ONLY.
 * Flow: AI triage -> moderation (reject) -> attach to matching glitch OR open a
 * new LEAKED glitch -> auto-close when the echo says "resolved" -> reopen FIXED
 * glitches on a new similar echo -> award points -> publish live events.
 * @exports ingestEcho, addScore, IngestInput, IngestResult
 * @usedBy src/lib/echoes.functions.ts (createEcho), src/server/simulator.ts
 */
import { eq, gt, ne, or, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, glitches, guardians } from '#/db/schema.ts'
import type { DistrictId, Echo, Glitch } from '#/lib/glitch.ts'
import { triageEcho } from './ai/index.ts'
import { publish } from './bus.ts'
import { computeMagicLevel, getGlitch, newId } from './repo.ts'

export type IngestInput = {
  description: string
  districtId: DistrictId | null
  guardianId: string
  imageUrl?: string | null
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
  const candidates = (
    await db
      .select({
        glitchId: glitches.glitchId,
        description: glitches.description,
        type: glitches.type,
        districtId: glitches.districtId,
        status: glitches.status,
      })
      .from(glitches)
      .where(or(ne(glitches.status, 'FIXED'), gt(glitches.updatedAt, recent)))
  ).map((c) => ({ ...c, districtId: c.districtId as DistrictId | null }))

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

  if (match) {
    glitchId = match.glitchId
    if (t.resolves && match.status !== 'FIXED') {
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
  publish({ type: outcome === 'new-glitch' ? 'glitch.created' : 'glitch.updated', glitch })
  publish({ type: 'magic.level', level: await computeMagicLevel() })
  return { echo, glitch, outcome }
}

export async function addScore(guardianId: string, points: number): Promise<void> {
  await db
    .update(guardians)
    .set({ score: sql`${guardians.score} + ${points}` })
    .where(eq(guardians.guardianId, guardianId))
}
