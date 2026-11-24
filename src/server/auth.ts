/**
 * @file Session auth helpers. SERVER-ONLY: call these inside createServerFn handlers
 * or server route handlers, never from components. All DB helpers are async.
 * Session = random token in the `gg_session` httpOnly cookie -> `sessions` table.
 * @exports hashPassword, verifyPassword, startSession, endSession, getCurrentGuardian,
 *   requireGuardian, requireCommander, AuthError
 * @usedBy src/lib/auth.functions.ts and every mutating *.functions.ts
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { db } from '#/db/index.ts'
import { guardians, sessions } from '#/db/schema.ts'
import type { Guardian } from '#/lib/glitch.ts'

const COOKIE = 'gg_session'

export class AuthError extends Error {}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const a = Buffer.from(hash, 'hex')
  const b = scryptSync(password, salt, 32)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function startSession(guardianId: string): Promise<void> {
  const token = randomBytes(24).toString('base64url')
  await db.insert(sessions).values({ token, guardianId, createdAt: new Date().toISOString() })
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function endSession(): Promise<void> {
  const token = getCookie(COOKIE)
  if (token) await db.delete(sessions).where(eq(sessions.token, token))
  deleteCookie(COOKIE, { path: '/' })
}

export async function getCurrentGuardian(): Promise<Guardian | null> {
  const token = getCookie(COOKIE)
  if (!token) return null
  const [row] = await db
    .select({ guardianId: guardians.guardianId, codename: guardians.codename, role: guardians.role })
    .from(sessions)
    .innerJoin(guardians, eq(sessions.guardianId, guardians.guardianId))
    .where(eq(sessions.token, token))
    .limit(1)
  return row ?? null
}

export async function requireGuardian(): Promise<Guardian> {
  const g = await getCurrentGuardian()
  if (!g) throw new AuthError('Not logged in')
  return g
}

export async function requireCommander(): Promise<Guardian> {
  const g = await requireGuardian()
  if (g.role !== 'commander') throw new AuthError('Commander rights required')
  return g
}
