/**
 * @file Read helpers shared by server functions: DB rows -> domain types,
 * glitch/echo queries and the overall magic level. SERVER-ONLY, all async.
 * @exports listGlitches (visible only), getGlitch (incl. hidden), listEchoes, computeMagicLevel, newId
 * @usedBy src/server/echo-pipeline.ts, src/server/simulator.ts, src/lib/*.functions.ts
 */
import { randomBytes } from 'node:crypto'
import { desc, eq, ne, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, glitches, guardians, sensorReadings } from '#/db/schema.ts'
import { DISTRICTS, type DistrictId, type Echo, type Glitch } from '#/lib/glitch.ts'

/** Short readable ids: GL-4F2A, EC-91BC, GD-07AA. */
export function newId(prefix: 'GL' | 'EC' | 'GD'): string {
  return `${prefix}-${randomBytes(2).toString('hex').toUpperCase()}`
}

const glitchColumns = {
  glitchId: glitches.glitchId,
  status: glitches.status,
  description: glitches.description,
  timestamp: glitches.timestamp,
  type: glitches.type,
  severity: glitches.severity,
  districtId: glitches.districtId,
  assigneeId: glitches.assigneeId,
  runbook: glitches.runbook,
  updatedAt: glitches.updatedAt,
  sabotage: glitches.sabotage,
  // Fully qualified on purpose: Drizzle renders ${glitches.glitchId} as a bare "glitch_id", which inside
  // this subquery would resolve to echoes.glitch_id and count every echo.
  echoCount: sql<number>`(select count(*)::int from "echoes" e where e."glitch_id" = "glitches"."glitch_id" and e."moderation" = 'ok')`,
}

type GlitchRow = { districtId: string | null } & Omit<Glitch, 'districtId'>
const toGlitch = (row: GlitchRow): Glitch => ({ ...row, districtId: row.districtId as DistrictId | null })

/** Visible glitches only: hidden (undiscovered sabotage, game mode) glitches are left out. */
export async function listGlitches(): Promise<Glitch[]> {
  const rows = await db.select(glitchColumns).from(glitches).where(eq(glitches.hidden, false)).orderBy(desc(glitches.timestamp))
  return rows.map(toGlitch)
}

export async function getGlitch(glitchId: string): Promise<Glitch | null> {
  const [row] = await db.select(glitchColumns).from(glitches).where(eq(glitches.glitchId, glitchId)).limit(1)
  return row ? toGlitch(row) : null
}

/** Echoes, newest first. Pass a glitchId to scope them to one glitch (else latest 200). */
export async function listEchoes(glitchId?: string): Promise<Echo[]> {
  const base = db
    .select({
      echoId: echoes.echoId,
      glitchId: echoes.glitchId,
      description: echoes.description,
      timestamp: echoes.timestamp,
      reportingGuardianId: echoes.reportingGuardianId,
      districtId: echoes.districtId,
      moderation: echoes.moderation,
      moderationReason: echoes.moderationReason,
      imageUrl: echoes.imageUrl,
      source: echoes.source,
      flag: echoes.flag,
      reporterCodename: guardians.codename,
    })
    .from(echoes)
    .innerJoin(guardians, eq(echoes.reportingGuardianId, guardians.guardianId))
  const rows = glitchId
    ? await base.where(eq(echoes.glitchId, glitchId)).orderBy(desc(echoes.timestamp))
    : await base.orderBy(desc(echoes.timestamp)).limit(200)
  return rows.map((r) => ({ ...r, districtId: r.districtId as DistrictId | null }))
}

const SEVERITY_PENALTY = { low: 2, medium: 5, high: 10, critical: 18 } as const

/**
 * Magic level 0-100: average of the latest sensor reading per district,
 * minus a penalty per open glitch by severity.
 */
export async function computeMagicLevel(): Promise<number> {
  const latest = await db
    .selectDistinctOn([sensorReadings.districtId], { districtId: sensorReadings.districtId, magic: sensorReadings.magic })
    .from(sensorReadings)
    .orderBy(sensorReadings.districtId, desc(sensorReadings.id))
  const byDistrict = new Map(latest.map((r) => [r.districtId, r.magic]))
  let level = DISTRICTS.reduce((sum, d) => sum + (byDistrict.get(d.id) ?? 100), 0) / DISTRICTS.length
  const open = await db.select({ severity: glitches.severity }).from(glitches).where(ne(glitches.status, 'FIXED'))
  for (const g of open) level -= SEVERITY_PENALTY[g.severity]
  return Math.max(0, Math.min(100, Math.round(level)))
}
