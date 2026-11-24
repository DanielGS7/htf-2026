/**
 * @file Server functions for the field + engagement views: phone echo reporting (createEchoField),
 * own stats, the live feed for /report, the leaderboard (badges computed here) and the High Council report.
 * @exports createEchoField, getReportData, getMyStats, getLeaderboard, getCouncilReport,
 *   FieldResult, MyStats, ReportData, LeaderboardEntry, Leaderboard, CouncilReport (types)
 * @usedBy src/routes/report.tsx, src/routes/leaderboard.tsx, src/routes/council.tsx, src/components/field/*
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { desc, eq, ne, sql } from 'drizzle-orm'
import { DISTRICTS, GLITCH_STATUSES, GLITCH_TYPES, SEVERITIES, type Glitch, type GlitchStatus, type GlitchType, type Severity } from '#/lib/glitch.ts'
import type { BadgeId } from '#/components/leaderboard/badgeMeta.ts'
import { db } from '#/db/index.ts'
import { echoes, glitches, guardians } from '#/db/schema.ts'
import { getCurrentGuardian, requireCommander, requireGuardian } from '#/server/auth.ts'
import { ingestEcho, POINTS, type IngestResult } from '#/server/echo-pipeline.ts'
import { computeMagicLevel, listGlitches } from '#/server/repo.ts'

const districtIds = DISTRICTS.map((d) => d.id) as [string, ...string[]]
const SYSTEM_GUARDIAN = 'Sentinel'

export type FieldResult = {
  outcome: IngestResult['outcome']
  rejectReason: string | null
  glitch: { glitchId: string; description: string; severity: Severity; status: GlitchStatus; echoCount: number } | null
  /** Points this echo earned. */
  gained: number
  /** The guardian's new total score. */
  score: number
}

export type MyStats = { codename: string; score: number; echoes: number; glitchesOpened: number; rank: number }
export type ReportData = { stats: MyStats | null; glitches: Glitch[] }

const GAINED: Record<IngestResult['outcome'], number> = {
  rejected: 0,
  'new-glitch': POINTS.echo + POINTS.newGlitch,
  grouped: POINTS.echo,
  resolved: POINTS.echo + POINTS.fixed,
  reopened: POINTS.echo,
}

export const createEchoField = createServerFn({ method: 'POST' })
  .validator((d: unknown) =>
    z
      .object({
        description: z.string().trim().min(3, 'Describe what you saw (3+ characters)').max(1000),
        districtId: z.enum(districtIds).nullable(),
        // data URL of a downscaled photo; ~600KB of bytes is ~800K of base64.
        imageUrl: z
          .string()
          .max(820_000, 'Photo is too large')
          .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, 'Unsupported image')
          .nullable(),
        /** 'radio' when sent from the walkie-talkie desk (/radio, F31). */
        source: z.enum(['app', 'radio']).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<FieldResult> => {
    const me = await requireGuardian()
    const r = await ingestEcho({
      description: data.description,
      districtId: data.districtId as IngestResult['echo']['districtId'],
      guardianId: me.guardianId,
      imageUrl: data.imageUrl,
      source: data.source,
    })
    const [row] = await db.select({ score: guardians.score }).from(guardians).where(eq(guardians.guardianId, me.guardianId)).limit(1)
    return {
      outcome: r.outcome,
      rejectReason: r.echo.moderationReason,
      glitch: r.glitch
        ? { glitchId: r.glitch.glitchId, description: r.glitch.description, severity: r.glitch.severity, status: r.glitch.status, echoCount: r.glitch.echoCount ?? 1 }
        : null,
      gained: GAINED[r.outcome],
      score: row?.score ?? 0,
    }
  })

async function statsFor(guardianId: string): Promise<MyStats | null> {
  const [g] = await db.select().from(guardians).where(eq(guardians.guardianId, guardianId)).limit(1)
  if (!g) return null
  const mine = await db.select({ glitchId: echoes.glitchId, timestamp: echoes.timestamp }).from(echoes).where(eq(echoes.reportingGuardianId, guardianId))
  const first = await firstReporters()
  const [{ ahead }] = await db
    .select({ ahead: sql<number>`count(*)::int` })
    .from(guardians)
    .where(sql`${guardians.score} > ${g.score} and ${guardians.codename} <> ${SYSTEM_GUARDIAN}`)
  return {
    codename: g.codename,
    score: g.score,
    echoes: mine.length,
    glitchesOpened: [...first.values()].filter((id) => id === guardianId).length,
    rank: ahead + 1,
  }
}

/** glitchId -> guardian whose accepted echo came first (the one who "opened" it). */
async function firstReporters(): Promise<Map<string, string>> {
  const rows = await db
    .selectDistinctOn([echoes.glitchId], { glitchId: echoes.glitchId, guardianId: echoes.reportingGuardianId })
    .from(echoes)
    .where(sql`${echoes.glitchId} is not null and ${echoes.moderation} = 'ok'`)
    .orderBy(echoes.glitchId, echoes.timestamp)
  return new Map(rows.map((r) => [r.glitchId!, r.guardianId]))
}

export const getMyStats = createServerFn({ method: 'GET' }).handler(async (): Promise<MyStats | null> => {
  const me = await getCurrentGuardian()
  return me ? statsFor(me.guardianId) : null
})

/** Loader data for /report: own stats + the latest glitches for the live feed. */
export const getReportData = createServerFn({ method: 'GET' }).handler(async (): Promise<ReportData> => {
  const me = await getCurrentGuardian()
  const [stats, all] = await Promise.all([me ? statsFor(me.guardianId) : null, listGlitches()])
  return { stats, glitches: all.slice(0, 12) }
})

export type LeaderboardEntry = {
  guardianId: string
  codename: string
  score: number
  rank: number
  echoes: number
  badges: BadgeId[]
}
export type Leaderboard = { entries: LeaderboardEntry[]; meId: string | null }

export const getLeaderboard = createServerFn({ method: 'GET' }).handler(async (): Promise<Leaderboard> => {
  const [me, people, allEchoes, fixed, first] = await Promise.all([
    getCurrentGuardian(),
    db.select().from(guardians).where(ne(guardians.codename, SYSTEM_GUARDIAN)).orderBy(desc(guardians.score), guardians.codename),
    db.select({ guardianId: echoes.reportingGuardianId, moderation: echoes.moderation }).from(echoes),
    db.select({ assigneeId: glitches.assigneeId }).from(glitches).where(eq(glitches.status, 'FIXED')),
    firstReporters(),
  ])
  const sent = new Map<string, { total: number; rejected: number }>()
  for (const e of allEchoes) {
    const s = sent.get(e.guardianId) ?? { total: 0, rejected: 0 }
    s.total++
    if (e.moderation === 'rejected') s.rejected++
    sent.set(e.guardianId, s)
  }
  const fixedBy = new Set(fixed.map((f) => f.assigneeId).filter(Boolean))
  const openedBy = new Set(first.values())
  const entries = people.map((p, i): LeaderboardEntry => {
    const s = sent.get(p.guardianId) ?? { total: 0, rejected: 0 }
    const badges: BadgeId[] = []
    if (openedBy.has(p.guardianId)) badges.push('first-responder')
    if (s.total >= 5) badges.push('storm-chaser')
    if (fixedBy.has(p.guardianId)) badges.push('fixer')
    if (s.total >= 3 && s.rejected === 0) badges.push('sharp-eye')
    if (p.role === 'commander') badges.push('commander')
    return { guardianId: p.guardianId, codename: p.codename, score: p.score, rank: i + 1, echoes: s.total, badges }
  })
  return { entries, meId: me?.guardianId ?? null }
})

export type CouncilReport = {
  generatedAt: string
  magic: number
  totals: { glitches: number; open: number; fixed: number; echoes: number; rejected: number; guardians: number }
  byStatus: { status: GlitchStatus; count: number }[]
  byType: { type: GlitchType; count: number }[]
  byDistrict: { districtId: string; name: string; total: number; open: number }[]
  openGlitches: Glitch[]
  /** Mean minutes from creation to FIXED (last update), null if nothing fixed yet. */
  meanFixMinutes: number | null
  topDefenders: { codename: string; score: number }[]
}

const SEV_RANK = Object.fromEntries(SEVERITIES.map((s, i) => [s, i])) as Record<Severity, number>

export const getCouncilReport = createServerFn({ method: 'GET' }).handler(async (): Promise<CouncilReport | { forbidden: true }> => {
  try {
    await requireCommander()
  } catch {
    return { forbidden: true }
  }
  const [all, magic, people, echoRows] = await Promise.all([
    listGlitches(),
    computeMagicLevel(),
    db.select({ codename: guardians.codename, score: guardians.score }).from(guardians).where(ne(guardians.codename, SYSTEM_GUARDIAN)).orderBy(desc(guardians.score)),
    db.select({ moderation: echoes.moderation }).from(echoes),
  ])
  const open = all.filter((g) => g.status !== 'FIXED')
  const fixed = all.filter((g) => g.status === 'FIXED')
  const fixTimes = fixed.map((g) => (Date.parse(g.updatedAt) - Date.parse(g.timestamp)) / 60_000).filter((m) => Number.isFinite(m) && m >= 0)
  return {
    generatedAt: new Date().toISOString(),
    magic,
    totals: {
      glitches: all.length,
      open: open.length,
      fixed: fixed.length,
      echoes: echoRows.length,
      rejected: echoRows.filter((e) => e.moderation === 'rejected').length,
      guardians: people.length,
    },
    byStatus: GLITCH_STATUSES.map((status) => ({ status, count: all.filter((g) => g.status === status).length })),
    byType: GLITCH_TYPES.map((type) => ({ type, count: all.filter((g) => g.type === type).length })).filter((t) => t.count > 0),
    byDistrict: DISTRICTS.map((d) => ({
      districtId: d.id,
      name: d.name,
      total: all.filter((g) => g.districtId === d.id).length,
      open: open.filter((g) => g.districtId === d.id).length,
    })),
    openGlitches: [...open].sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || b.timestamp.localeCompare(a.timestamp)),
    meanFixMinutes: fixTimes.length ? fixTimes.reduce((a, b) => a + b, 0) / fixTimes.length : null,
    topDefenders: people.slice(0, 5),
  }
})
