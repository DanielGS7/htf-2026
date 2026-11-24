/**
 * @file End-to-end flows: auth, roles, glitch workflow, field reporting, live updates,
 * AI fallback (Oracle), leaderboard, council report, mission control and the simulator.
 */
import pg from 'pg'
import { test, expect, gotoReady, login, quickJoin } from './fixtures.ts'

test.describe.configure({ mode: 'serial' })

test('logged-out users are redirected to login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login\?next=/)
  await expect(page.getByRole('heading', { name: 'Guardian login' })).toBeVisible()
})

test('wrong password shows an error', async ({ page }) => {
  await gotoReady(page, '/login')
  await page.getByLabel('Codename').fill('Nova')
  await page.getByLabel('Password').fill('wrong')
  await page.getByRole('button', { name: 'Enter mission control' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('commander sees the seeded glitches on the overview', async ({ page }) => {
  await login(page, 'Nova')
  for (const id of ['GL-0142', 'GL-0141', 'GL-0139', 'GL-0137']) {
    await expect(page.locator(`[data-glitch-id="${id}"]`)).toBeVisible()
  }
  // Seed: GL-0142 has 2 echoes, GL-0141 has 1 (guards the per-glitch echo count subquery).
  const echoesCell = (id: string) => page.locator(`[data-glitch-id="${id}"] td`).nth(5) // icon, glitch, severity, status, district, echoes
  await expect(echoesCell('GL-0142')).toHaveText('2')
  await expect(echoesCell('GL-0141')).toHaveText('1')
  await page.screenshot({ path: 'test-results/screens/overview.png', fullPage: true })
})

test('commander advances a glitch status and assigns a defender', async ({ page }) => {
  await login(page, 'Nova')
  await page.locator('[data-glitch-id="GL-0142"]').click()
  await expect(page).toHaveURL(/\/glitches\/GL-0142/)
  await expect(page.getByText('Commander controls')).toBeVisible()
  await page.getByRole('button', { name: 'Advance to ASSESSING' }).click()
  await expect(page.getByLabel('Set status')).toHaveValue('ASSESSING')
  const assign = page.getByLabel('Assign defender')
  await expect(assign).toBeEnabled()
  await assign.selectOption('GD-0002') // Ember
  await expect(assign).toHaveValue('GD-0002')
  await page.reload()
  await expect(page.getByLabel('Set status')).toHaveValue('ASSESSING')
  await page.screenshot({ path: 'test-results/screens/glitch-detail.png', fullPage: true })
})

test('defender has no commander controls or admin access', async ({ page }) => {
  await login(page, 'Ember')
  await page.goto('/glitches/GL-0141')
  await expect(page.getByRole('heading').first()).toBeVisible()
  await expect(page.getByText('Commander controls')).toHaveCount(0)
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Commanders only' })).toBeVisible()
})

test('quick-join defender reports an echo on mobile and gets an outcome', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await quickJoin(page)
  await page.locator('#echo-text').fill('A giant rift is tearing open above the Rune Market, stalls are falling into the void')
  await page.getByRole('button', { name: 'Send echo' }).click()
  await expect(page.getByText(/New glitch opened|Grouped with/)).toBeVisible()
  // No horizontal scroll at phone width.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  await page.screenshot({ path: 'test-results/screens/report-mobile.png', fullPage: true })
  expect(errors).toEqual([])
  await ctx.close()
})

test('junk echoes are rejected by moderation', async ({ page }) => {
  await quickJoin(page)
  await page.locator('#echo-text').fill('asdf')
  await page.getByRole('button', { name: 'Send echo' }).click()
  await expect(page.getByText(/Rejected:/)).toBeVisible()
})

test('commander overview updates live when a defender reports an echo', async ({ browser }) => {
  const commanderCtx = await browser.newContext()
  const commander = await commanderCtx.newPage()
  await login(commander, 'Nova')
  const before = await commander.locator('[data-glitch-id]').count()
  await commander.waitForTimeout(1000) // let the SSE stream connect

  const defenderCtx = await browser.newContext()
  const defender = await defenderCtx.newPage()
  await quickJoin(defender)
  await defender.locator('#echo-text').fill('Memories are leaking out of the Whispering Forest, nobody remembers their names')
  await defender.getByRole('button', { name: 'Send echo' }).click()
  await expect(defender.getByText(/New glitch opened|Grouped with/)).toBeVisible()

  // No reload on the commander side: the new glitch must arrive over SSE.
  await expect.poll(() => commander.locator('[data-glitch-id]').count(), { timeout: 10_000 }).toBeGreaterThan(before)
  await commanderCtx.close()
  await defenderCtx.close()
})

test('the Oracle answers (offline heuristics when AI is disabled)', async ({ page }) => {
  await login(page, 'Ember')
  await gotoReady(page, '/oracle')
  await page.getByPlaceholder('Ask the Oracle...').fill('What is the most critical glitch?')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText(/Oracle is offline|situation/i).first()).toBeVisible({ timeout: 15_000 })
})

test('leaderboard ranks guardians', async ({ page }) => {
  await login(page, 'Ember')
  await page.goto('/leaderboard')
  await expect(page.getByText('Nova').first()).toBeVisible()
  await expect(page.getByText('Sentinel')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/screens/leaderboard.png', fullPage: true })
})

test('council report is commander-only', async ({ page, browser }) => {
  const defenderCtx = await browser.newContext()
  const defender = await defenderCtx.newPage()
  await login(defender, 'Ember')
  await gotoReady(defender, '/council')
  await expect(defender.getByRole('button', { name: /Download PDF/i })).toHaveCount(0)
  await defenderCtx.close()
  await login(page, 'Nova')
  await gotoReady(page, '/council')
  await expect(page.getByRole('button', { name: /Download PDF/i })).toBeVisible()
  await page.screenshot({ path: 'test-results/screens/council.png', fullPage: true })
})

test('mission control renders map, gauge and join QR', async ({ page }) => {
  await login(page, 'Nova')
  await page.goto('/mission')
  await expect(page.locator('svg').first()).toBeVisible()
  await expect(page.getByText(/join/i).first()).toBeVisible()
  await expect(page.locator('img[src^="data:image"], svg[aria-label*="QR" i], [data-qr]').first()).toBeVisible()
  await page.screenshot({ path: 'test-results/screens/mission.png', fullPage: true })
})

test('a Desync attack drains magic live and the scripted echoes land on glitches', async ({ browser }) => {
  test.setTimeout(90_000)
  const ctx = await browser.newContext()
  const admin = await ctx.newPage()
  await login(admin, 'Nova')
  const mission = await ctx.newPage()
  await gotoReady(mission, '/mission')
  const gauge = mission.getByRole('meter', { name: 'Magic level' }).first()
  const startLevel = Number(await gauge.getAttribute('aria-valuenow'))
  expect(startLevel).toBeGreaterThan(60)

  await gotoReady(admin, '/admin')
  await admin.getByRole('button', { name: 'Launch' }).last().click() // Total Desync
  await expect(admin.getByRole('button', { name: 'Attack in progress' }).first()).toBeVisible()

  // The mission screen (another tab: events relayed via BroadcastChannel) shows magic draining.
  await expect
    .poll(async () => Number(await gauge.getAttribute('aria-valuenow')), { timeout: 30_000, intervals: [2000] })
    .toBeLessThan(startLevel - 20)
  await mission.screenshot({ path: 'test-results/screens/mission-attack.png', fullPage: true })

  // Scripted Sentinel echoes reach the DB and are triaged onto glitches (grouped with seeds or new).
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? 'postgres://guardian:guardian@localhost:5432/achrona' })
  await db.connect()
  await expect
    .poll(async () => {
      const r = await db.query(
        `select count(*)::int as n from echoes e join guardians g on g.guardian_id = e.reporting_guardian_id
         where g.codename = 'Sentinel' and e.glitch_id is not null`,
      )
      return r.rows[0].n as number
    }, { timeout: 30_000, intervals: [3000] })
    .toBeGreaterThanOrEqual(4)
  await db.end()

  await admin.getByRole('button', { name: 'Stop' }).click()
  await ctx.close()
})
