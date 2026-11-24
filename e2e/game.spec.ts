/**
 * @file Game mode (F33) engine E2E: sabotage is hidden, a matching echo reveals it, a defender's fix
 * resolves it while the Desync's fake fix does not, and a meeting vote that ejects the Desync ends the
 * round. Drives the real server functions from the browser (dynamic import of the *.functions.ts modules
 * in the Vite dev server) and checks effects in the UI and in Postgres.
 */
import type { Page } from '@playwright/test'
import pg from 'pg'
import { test, expect, gotoReady, login } from './fixtures.ts'

test.describe.configure({ mode: 'serial' })

type Mod = 'game' | 'echoes'
/** Call a server function as the page's signed-in user. */
async function call<T = unknown>(page: Page, mod: Mod, fn: string, data?: unknown): Promise<T> {
  return page.evaluate(
    async ([m, f, d]) => {
      const mod = await import(/* @vite-ignore */ `/src/lib/${m === 'game' ? 'game' : 'echoes'}.functions.ts`)
      return d === undefined ? mod[f as string]() : mod[f as string]({ data: d })
    },
    [mod, fn, data] as [string, string, unknown],
  ) as Promise<T>
}

const DB_URL = process.env.DATABASE_URL ?? 'postgres://guardian:guardian@localhost:5432/achrona'

test('desync protocol: sabotage -> discovery -> fixes -> meeting -> defenders win', async ({ browser }) => {
  test.setTimeout(120_000)
  const db = new pg.Client({ connectionString: DB_URL })
  await db.connect()

  const ctxs = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()])
  const [nova, ember, quill] = await Promise.all(ctxs.map((c) => c.newPage()))
  await login(nova, 'Nova')
  await login(ember, 'Ember')
  await login(quill, 'Quill')

  // Lobby -> start with Ember + Quill as the crew.
  const crew = await call<{ guardianId: string; codename: string }[]>(nova, 'game', 'listCrewCandidates')
  expect(crew.map((c) => c.codename)).not.toContain('Sentinel')
  const ids = crew.filter((c) => ['Ember', 'Quill'].includes(c.codename)).map((c) => c.guardianId)
  await call(nova, 'game', 'gameSetup', { crewIds: ids, roundMinutes: 3 })
  const started = await call<Record<string, unknown>>(nova, 'game', 'gameStart')
  expect(started.phase).toBe('playing')
  expect(started.desyncId).toBeNull() // never leaked while playing
  expect(JSON.stringify(started)).not.toMatch(/"role":"desync"/)

  // Find the Desync (private views).
  const views = {
    ember: await call<{ role: string }>(ember, 'game', 'getMyGameView'),
    quill: await call<{ role: string }>(quill, 'game', 'getMyGameView'),
  }
  const desyncIsEmber = views.ember.role === 'desync'
  expect([views.ember.role, views.quill.role].sort()).toEqual(['defender', 'desync'])
  const [desync, defender] = desyncIsEmber ? [ember, quill] : [quill, ember]
  const desyncId = ids[desyncIsEmber ? crew.filter((c) => ids.includes(c.guardianId)).findIndex((c) => c.codename === 'Ember') : crew.filter((c) => ids.includes(c.guardianId)).findIndex((c) => c.codename === 'Quill')]!

  // 1. Sabotage creates a hidden glitch that is NOT visible.
  const forBefore = await call<{ sabotages: unknown[] }>(defender, 'game', 'getMyGameView')
  expect(forBefore.sabotages).toEqual([]) // defenders never see sabotages
  const sab = await call<{ sabotages: { glitchId: string }[]; sabotageCooldownUntil: string | null }>(desync, 'game', 'sabotage', {
    districtId: 'forest',
    type: 'PORTAL_FLICKER',
  })
  expect(sab.sabotages).toHaveLength(1)
  expect(sab.sabotageCooldownUntil).not.toBeNull()
  const glitchId = sab.sabotages[0]!.glitchId
  const row = async () => (await db.query('select hidden, sabotage, status from glitches where glitch_id = $1', [glitchId])).rows[0]
  expect(await row()).toMatchObject({ hidden: true, sabotage: true, status: 'LEAKED' })
  await gotoReady(nova, '/')
  await expect(nova.locator('[data-glitch-id="GL-0142"]')).toBeVisible()
  await expect(nova.locator(`[data-glitch-id="${glitchId}"]`)).toHaveCount(0)
  // A defender cannot sabotage.
  await expect(call(defender, 'game', 'sabotage', { districtId: 'market', type: 'MEMORY_LEAK' })).rejects.toThrow()
  // Cooldown + one per district.
  await expect(call(desync, 'game', 'sabotage', { districtId: 'market', type: 'MEMORY_LEAK' })).rejects.toThrow()

  // A report about a healthy district is flagged unconfirmed.
  await call(defender, 'echoes', 'createEcho', { description: 'Rune Market stalls are echoing strange noise everywhere', districtId: 'market' })
  const flagged = await db.query(`select flag from echoes where description like 'Rune Market stalls%'`)
  expect(flagged.rows[0].flag).toBe('unconfirmed')

  // 2. A matching echo reveals the hidden glitch.
  await call(defender, 'echoes', 'createEcho', {
    description: 'Portal gates in the Whispering Forest keep flickering open and shut',
    districtId: 'forest',
  })
  await expect.poll(async () => (await row()).hidden).toBe(false)
  await gotoReady(nova, '/')
  await expect(nova.locator(`[data-glitch-id="${glitchId}"]`)).toBeVisible()
  const fixable = await call<{ glitchId: string; sabotage: boolean }[]>(defender, 'game', 'listFixable')
  expect(fixable[0]?.glitchId).toBe(glitchId) // sabotage glitches first
  const state = await call<{ discoveredSabotages: number; hiddenSabotages: number }>(nova, 'game', 'getGameState')
  expect(state).toMatchObject({ discoveredSabotages: 1, hiddenSabotages: 0 })

  // 3. The Desync's fix is fake; a defender's fix resolves it.
  expect(await call(desync, 'game', 'completeFix', { glitchId })).toEqual({ ok: true, points: 0 })
  expect((await row()).status).toBe('LEAKED')
  expect(await call(defender, 'game', 'completeFix', { glitchId })).toEqual({ ok: true, points: 10 })
  expect((await row()).status).toBe('FIXED')

  // 4. Meeting: both crew vote the Desync out -> defenders win.
  const meeting = await call<{ phase: string; meetingsLeft: number }>(defender, 'game', 'callMeeting')
  expect(meeting).toMatchObject({ phase: 'meeting', meetingsLeft: 2 })
  await call(defender, 'game', 'castVote', { suspectId: 'skip' })
  const mid = await call<{ myVote: string | null }>(defender, 'game', 'castVote', { suspectId: desyncId }) // re-vote replaces
  expect(mid.myVote).toBe(desyncId)
  await call(desync, 'game', 'castVote', { suspectId: desyncId }) // everyone active voted: the vote closes
  const ended = async () => call<{ phase: string; winner: string | null; desyncId: string | null; endReason: string | null }>(nova, 'game', 'getGameState')
  await expect.poll(async () => (await ended()).phase, { timeout: 20_000, intervals: [1000] }).toBe('ended')
  expect(await ended()).toMatchObject({ winner: 'defenders', desyncId })

  await call(nova, 'game', 'gameStop')
  expect((await ended()).phase).toBe('idle')
  await db.end()
  for (const c of ctxs) await c.close()
})
