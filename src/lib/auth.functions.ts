/**
 * @file Auth server functions + client hook. getMe (root beforeLoad), loginFn, joinFn (quick-join
 * with generated codename, passwordless defender), logoutFn. Login/join return `{ ok: false, error }`
 * instead of throwing so forms can show the message.
 * `useMe()` returns the current Guardian | null from the root route context.
 * @exports getMe, loginFn, joinFn, logoutFn, useMe, AuthResult (type)
 * @usedBy src/routes/__root.tsx, src/routes/login.tsx, src/routes/join.tsx, src/components/layout/*
 */
import { createServerFn } from '@tanstack/react-start'
import { useRouteContext } from '@tanstack/react-router'
import type { Guardian } from '#/lib/glitch.ts'
import { generateCodename } from '#/lib/codenames.ts'
import { db } from '#/db/index.ts'
import { guardians } from '#/db/schema.ts'
import { sql } from 'drizzle-orm'
import { endSession, getCurrentGuardian, startSession, verifyPassword } from '#/server/auth.ts'
import { newId } from '#/server/repo.ts'

export type AuthResult = { ok: true; me: Guardian } | { ok: false; error: string }

export const getMe = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Guardian | null> => getCurrentGuardian(),
)

export const loginFn = createServerFn({ method: 'POST' })
  .validator((d: { codename: string; password: string }) => ({
    codename: String(d.codename ?? '').trim(),
    password: String(d.password ?? ''),
  }))
  .handler(async ({ data }): Promise<AuthResult> => {
    if (!data.codename) return { ok: false, error: 'Enter your codename.' }
    const [row] = await db
      .select()
      .from(guardians)
      .where(sql`lower(${guardians.codename}) = ${data.codename.toLowerCase()}`)
      .limit(1)
    if (!row) return { ok: false, error: 'Unknown codename. New here? Use quick join.' }
    if (!row.passwordHash) {
      return { ok: false, error: 'This guardian has no password. Join again with a new codename.' }
    }
    if (!verifyPassword(data.password, row.passwordHash)) {
      return { ok: false, error: 'Wrong password. The runes do not match.' }
    }
    await startSession(row.guardianId)
    return { ok: true, me: { guardianId: row.guardianId, codename: row.codename, role: row.role } }
  })

export const joinFn = createServerFn({ method: 'POST' }).handler(async (): Promise<AuthResult> => {
  for (let attempt = 0; attempt < 12; attempt++) {
    const codename = generateCodename(attempt)
    const [row] = await db
      .insert(guardians)
      .values({
        guardianId: newId('GD'),
        codename,
        role: 'defender',
        passwordHash: null,
        score: 0,
        createdAt: new Date().toISOString(),
      })
      .onConflictDoNothing()
      .returning()
    if (row) {
      await startSession(row.guardianId)
      return { ok: true, me: { guardianId: row.guardianId, codename: row.codename, role: row.role } }
    }
  }
  return { ok: false, error: 'The gates are crowded. Try again in a moment.' }
})

export const logoutFn = createServerFn({ method: 'POST' }).handler(async (): Promise<void> => {
  await endSession()
})

/** Current guardian from the root route context (null on public pages when logged out). */
export function useMe(): Guardian | null {
  return useRouteContext({ from: '__root__', select: (c) => (c as { me: Guardian | null }).me })
}

