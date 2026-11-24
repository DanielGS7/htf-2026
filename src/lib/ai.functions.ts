/**
 * @file Server functions for the AI layer: status, runbook generation (commander, saved to the
 * glitch), Oracle chat (any guardian) and AI assignee suggestion (commander, F22).
 * All fall back to offline heuristics when Claude is unavailable.
 * @exports getAiStatus, generateRunbookFn, askOracleFn, suggestAssigneeFn, AiStatus, AssigneeSuggestionResult
 * @usedBy src/components/ai/*, src/routes/oracle.tsx
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, count, desc, eq, ne } from 'drizzle-orm'
import { DISTRICTS } from '#/lib/glitch.ts'
import { db } from '#/db/index.ts'
import { glitches, guardians } from '#/db/schema.ts'
import { aiEnabled, aiModel, askOracle, generateRunbook, suggestAssignee } from '#/server/ai/index.ts'
import { requireCommander, requireGuardian } from '#/server/auth.ts'
import { publish } from '#/server/bus.ts'
import { computeMagicLevel, getGlitch, listEchoes, listGlitches } from '#/server/repo.ts'

export type AiStatus = { enabled: boolean; model: string }
export type AssigneeSuggestionResult = { guardianId: string | null; codename: string | null; reason: string }

const districtName = (id: string | null) => DISTRICTS.find((d) => d.id === id)?.name ?? null

export const getAiStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AiStatus> => ({ enabled: aiEnabled(), model: aiModel() }),
)

export const generateRunbookFn = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ glitchId: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<{ runbook: string }> => {
    await requireCommander()
    const glitch = await getGlitch(data.glitchId)
    if (!glitch) throw new Error('Glitch not found')
    const list = await listEchoes(glitch.glitchId)
    const runbook = await generateRunbook({
      description: glitch.description,
      type: glitch.type,
      districtName: districtName(glitch.districtId),
      echoes: list.filter((e) => e.moderation === 'ok').map((e) => e.description),
    })
    await db
      .update(glitches)
      .set({ runbook, updatedAt: new Date().toISOString() })
      .where(eq(glitches.glitchId, glitch.glitchId))
    const updated = await getGlitch(glitch.glitchId)
    if (updated) publish({ type: 'glitch.updated', glitch: updated })
    return { runbook }
  })

async function buildOracleContext(): Promise<string> {
  const [level, all, recent, top] = await Promise.all([
    computeMagicLevel(),
    listGlitches(),
    listEchoes(),
    db
      .select({ codename: guardians.codename, score: guardians.score })
      .from(guardians)
      .where(ne(guardians.codename, 'Sentinel'))
      .orderBy(desc(guardians.score))
      .limit(5),
  ])
  const names = new Map((await db.select({ id: guardians.guardianId, c: guardians.codename }).from(guardians)).map((r) => [r.id, r.c]))
  const open = all.filter((g) => g.status !== 'FIXED')
  const lines = [
    `Magic level: ${level}/100`,
    `Open glitches: ${open.length} (fixed: ${all.length - open.length})`,
    ...open.map(
      (g) =>
        `- ${g.glitchId} [${g.status}] ${g.type} ${g.severity} @ ${districtName(g.districtId) ?? 'unknown district'} | assignee: ${g.assigneeId ? (names.get(g.assigneeId) ?? '?') : 'none'} | echoes: ${g.echoCount ?? 0} | "${g.description}"`,
    ),
    'Last 10 echoes:',
    ...recent
      .slice(0, 10)
      .map((e) => `- ${e.timestamp} ${e.glitchId ?? 'no glitch'} (${e.moderation}) by ${e.reporterCodename ?? '?'}: "${e.description}"`),
    'Top defenders:',
    ...top.map((t, i) => `${i + 1}. ${t.codename}: ${t.score} pts`),
  ]
  return lines.join('\n')
}

export const askOracleFn = createServerFn({ method: 'POST' })
  .validator((d: unknown) =>
    z
      .object({
        question: z.string().trim().min(1).max(600),
        history: z
          .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
          .max(20)
          .default([]),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ answer: string }> => {
    await requireGuardian()
    const answer = await askOracle({ question: data.question, history: data.history, context: await buildOracleContext() })
    return { answer }
  })

export const suggestAssigneeFn = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ glitchId: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<AssigneeSuggestionResult> => {
    await requireCommander()
    const glitch = await getGlitch(data.glitchId)
    if (!glitch) throw new Error('Glitch not found')
    const rows = await db.select({ guardianId: guardians.guardianId, codename: guardians.codename }).from(guardians).where(ne(guardians.codename, 'Sentinel'))
    const openByGuardian = await db
      .select({ id: glitches.assigneeId, n: count() })
      .from(glitches)
      .where(ne(glitches.status, 'FIXED'))
      .groupBy(glitches.assigneeId)
    const fixedByGuardian = await db
      .select({ id: glitches.assigneeId, n: count() })
      .from(glitches)
      .where(and(eq(glitches.status, 'FIXED'), eq(glitches.type, glitch.type)))
      .groupBy(glitches.assigneeId)
    const open = new Map(openByGuardian.map((r) => [r.id, r.n]))
    const fixed = new Map(fixedByGuardian.map((r) => [r.id, r.n]))
    const candidates = rows.map((r) => ({
      guardianId: r.guardianId,
      codename: r.codename,
      openCount: open.get(r.guardianId) ?? 0,
      fixedOfType: fixed.get(r.guardianId) ?? 0,
    }))
    const pick = await suggestAssignee({
      glitch: { description: glitch.description, type: glitch.type, severity: glitch.severity, districtName: districtName(glitch.districtId) },
      candidates: [...candidates].sort((a, b) => a.openCount - b.openCount).slice(0, 40),
    })
    return {
      guardianId: pick.guardianId,
      codename: candidates.find((c) => c.guardianId === pick.guardianId)?.codename ?? null,
      reason: pick.reason,
    }
  })
