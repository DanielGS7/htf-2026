/**
 * @file Server functions for the glitch workflow: list/read, status changes, assignment,
 * echo override (move) and defender suggestions. Mutations require a session
 * (commander for status/assign/move), publish live events and keep magic level fresh.
 * @exports getOverview, getGlitches, getGlitchDetail, setGlitchStatus, assignGlitch, moveEcho,
 *   listDefenders, getMeLite, GlitchDetail, Overview, DefenderOption
 * @usedBy src/routes/index.tsx, src/routes/glitches.$glitchId.tsx, src/components/glitches/*
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, count, eq, inArray, ne, sql } from 'drizzle-orm'
import { GLITCH_STATUSES, type Echo, type Glitch, type Guardian } from '#/lib/glitch.ts'
import { db } from '#/db/index.ts'
import { echoes, glitches, guardians } from '#/db/schema.ts'
import { getCurrentGuardian, requireCommander } from '#/server/auth.ts'
import { publish } from '#/server/bus.ts'
import { addScore, POINTS } from '#/server/echo-pipeline.ts'
import { computeMagicLevel, getGlitch, listEchoes, listGlitches, newId } from '#/server/repo.ts'

export type Overview = {
  glitches: Glitch[]
  /** guardianId -> codename for every assignee in `glitches`. */
  names: Record<string, string>
  me: Guardian | null
}

export type GlitchDetail = {
  glitch: Glitch
  echoes: Echo[]
  assignee: { guardianId: string; codename: string } | null
  me: Guardian | null
}

export type DefenderOption = { guardianId: string; codename: string; role: string; openCount: number }

/** Lightweight "who am I" (WP-A's useMe() supersedes this when available). */
export const getMeLite = createServerFn({ method: 'GET' }).handler(async (): Promise<Guardian | null> =>
  getCurrentGuardian(),
)

async function namesFor(ids: (string | null)[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))]
  if (!unique.length) return {}
  const rows = await db
    .select({ id: guardians.guardianId, codename: guardians.codename })
    .from(guardians)
    .where(inArray(guardians.guardianId, unique))
  return Object.fromEntries(rows.map((r) => [r.id, r.codename]))
}

export const getGlitches = createServerFn({ method: 'GET' }).handler(async (): Promise<Glitch[]> => listGlitches())

export const getOverview = createServerFn({ method: 'GET' }).handler(async (): Promise<Overview> => {
  const [list, me] = await Promise.all([listGlitches(), getCurrentGuardian()])
  return { glitches: list, names: await namesFor(list.map((g) => g.assigneeId)), me }
})

export const getGlitchDetail = createServerFn({ method: 'GET' })
  .validator((d: unknown) => z.object({ glitchId: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<GlitchDetail | null> => {
    const [glitch, me] = await Promise.all([getGlitch(data.glitchId), getCurrentGuardian()])
    if (!glitch) return null
    let list = await listEchoes(data.glitchId)
    // Rejected echoes are moderation material: commanders see all, reporters see their own.
    if (me?.role !== 'commander') {
      list = list.filter((e) => e.moderation === 'ok' || e.reportingGuardianId === me?.guardianId)
    }
    const names = await namesFor([glitch.assigneeId])
    const assignee = glitch.assigneeId ? { guardianId: glitch.assigneeId, codename: names[glitch.assigneeId] ?? '?' } : null
    return { glitch, echoes: list, assignee, me }
  })

async function announce(glitchId: string) {
  const glitch = await getGlitch(glitchId)
  if (glitch) publish({ type: 'glitch.updated', glitch })
  publish({ type: 'magic.level', level: await computeMagicLevel() })
  return glitch
}

export const setGlitchStatus = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ glitchId: z.string(), status: z.enum(GLITCH_STATUSES) }).parse(d))
  .handler(async ({ data }): Promise<Glitch> => {
    await requireCommander()
    const before = await getGlitch(data.glitchId)
    if (!before) throw new Error('Glitch not found')
    if (before.status === data.status) return before
    await db
      .update(glitches)
      .set({ status: data.status, updatedAt: new Date().toISOString() })
      .where(eq(glitches.glitchId, data.glitchId))
    if (data.status === 'FIXED' && before.assigneeId) await addScore(before.assigneeId, POINTS.fixed)
    return (await announce(data.glitchId))!
  })

export const assignGlitch = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ glitchId: z.string(), assigneeId: z.string().nullable() }).parse(d))
  .handler(async ({ data }): Promise<Glitch> => {
    await requireCommander()
    if (!(await getGlitch(data.glitchId))) throw new Error('Glitch not found')
    await db
      .update(glitches)
      .set({ assigneeId: data.assigneeId, updatedAt: new Date().toISOString() })
      .where(eq(glitches.glitchId, data.glitchId))
    const glitch = (await announce(data.glitchId))!
    if (data.assigneeId) {
      publish({ type: 'toast', tone: 'info', message: `${glitch.glitchId} assigned: ${glitch.description}` })
    }
    return glitch
  })

/** Override AI grouping: move an echo to another glitch, or (toGlitchId null) into a brand new one. */
export const moveEcho = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ echoId: z.string(), toGlitchId: z.string().nullable() }).parse(d))
  .handler(async ({ data }): Promise<{ glitchId: string }> => {
    await requireCommander()
    const [echo] = await db.select().from(echoes).where(eq(echoes.echoId, data.echoId)).limit(1)
    if (!echo) throw new Error('Echo not found')
    const now = new Date().toISOString()
    let target = data.toGlitchId
    let created = false
    if (target) {
      if (!(await getGlitch(target))) throw new Error('Target glitch not found')
    } else {
      target = newId('GL')
      created = true
      const [src] = echo.glitchId ? await db.select().from(glitches).where(eq(glitches.glitchId, echo.glitchId)) : []
      await db.insert(glitches).values({
        glitchId: target,
        status: 'LEAKED',
        description: echo.description.slice(0, 80),
        timestamp: now,
        type: src?.type ?? 'UNKNOWN',
        severity: src?.severity ?? 'medium',
        districtId: echo.districtId ?? src?.districtId ?? null,
        updatedAt: now,
      })
    }
    const from = echo.glitchId
    await db.update(echoes).set({ glitchId: target, moderation: 'ok', moderationReason: null }).where(eq(echoes.echoId, echo.echoId))
    await db.update(glitches).set({ updatedAt: now }).where(eq(glitches.glitchId, target))
    const glitch = (await getGlitch(target))!
    publish({ type: created ? 'glitch.created' : 'glitch.updated', glitch })
    if (from && from !== target) await announce(from)
    publish({ type: 'magic.level', level: await computeMagicLevel() })
    return { glitchId: target }
  })

/**
 * Assignable guardians with their open-assignment count. `suggestedId` is the best pick:
 * fewest open assignments, ties broken by most fixed glitches of the same type (F22).
 */
export const listDefenders = createServerFn({ method: 'GET' })
  .validator((d: unknown) => z.object({ glitchId: z.string().optional() }).optional().parse(d))
  .handler(async ({ data }): Promise<{ defenders: DefenderOption[]; suggestedId: string | null }> => {
    const rows = await db
      .select({
        guardianId: guardians.guardianId,
        codename: guardians.codename,
        role: guardians.role,
        openCount: sql<number>`(select count(*)::int from ${glitches} where ${glitches.assigneeId} = ${guardians.guardianId} and ${glitches.status} <> 'FIXED')`,
      })
      .from(guardians)
      .where(ne(guardians.codename, 'Sentinel'))
    const target = data?.glitchId ? await getGlitch(data.glitchId) : null
    const fixedByType = new Map<string, number>()
    if (target) {
      const fixed = await db
        .select({ id: glitches.assigneeId, n: count() })
        .from(glitches)
        .where(and(eq(glitches.status, 'FIXED'), eq(glitches.type, target.type)))
        .groupBy(glitches.assigneeId)
      for (const f of fixed) if (f.id) fixedByType.set(f.id, f.n)
    }
    const ranked = [...rows].sort(
      (a, b) =>
        a.openCount - b.openCount ||
        (fixedByType.get(b.guardianId) ?? 0) - (fixedByType.get(a.guardianId) ?? 0) ||
        a.codename.localeCompare(b.codename),
    )
    return { defenders: ranked.slice(0, 100), suggestedId: ranked[0]?.guardianId ?? null }
  })
