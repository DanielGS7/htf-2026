/**
 * @file End-to-end round of "Desync Protocol" through the REAL UI (no faked server responses):
 * commander lobby on /admin, projector on /mission, two crew phones + one audience phone on /report.
 * Covers role cards, the hidden sabotage console (long-press), discovery by report, the fix mini-task,
 * an emergency meeting vote and the end screen. Saves screenshots to test-results/screens/game-*.png.
 */
import type { Browser, BrowserContext, Page } from '@playwright/test'
import { test, expect, gotoReady, login, quickJoin } from './fixtures.ts'

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
const shot = (p: Page, name: string) => p.screenshot({ path: `test-results/screens/game-${name}.png` })

/** Contexts this test opens. Closed at the end: manually created contexts outlive the test, and a
 * leftover phone on /report would count as an active player (who never votes) in the next round. */
const opened: BrowserContext[] = []
async function newCtx(browser: Browser, opts?: Parameters<Browser['newContext']>[0]) {
  const ctx = await browser.newContext(opts)
  opened.push(ctx)
  return ctx
}
test.afterEach(async () => {
  await Promise.all(opened.splice(0).map((c) => c.close()))
})

async function phone(browser: Browser, codename: string) {
  const ctx = await newCtx(browser, PHONE)
  const page = await ctx.newPage()
  await login(page, codename)
  await gotoReady(page, '/report')
  return page
}

test('a full Desync Protocol round through the real UI', async ({ browser }) => {
  test.setTimeout(240_000)

  // Commander + projector
  const admin = await (await newCtx(browser)).newPage()
  await login(admin, 'Nova')
  await gotoReady(admin, '/admin')
  const projector = await (await newCtx(browser, { viewport: { width: 1920, height: 1080 } })).newPage()
  await login(projector, 'Nova')
  await gotoReady(projector, '/mission')

  // Crew phones + an audience phone
  const ember = await phone(browser, 'Ember')
  const quill = await phone(browser, 'Quill')
  const audience = await (await newCtx(browser, PHONE)).newPage()
  await quickJoin(audience)

  // Lobby: crew = Ember + Quill (Nova runs the projector)
  await admin.getByRole('checkbox', { name: /Nova/ }).uncheck()
  await admin.getByRole('button', { name: /Set up crew/i }).click()
  await expect(projector.getByText(/One of this crew is the Desync/i)).toBeVisible()
  await shot(projector, '1-lobby')
  await admin.getByRole('button', { name: /Start round/i }).click()

  // Secret role cards
  // The card is a full-screen button: "You are" + "THE DESYNC" / "A DEFENDER" (auto-closes after 7s).
  const roleOf = async (p: Page) => {
    const card = p.getByRole('button', { name: 'Dismiss role card' })
    await expect(card).toBeVisible({ timeout: 15_000 })
    return /THE DESYNC/.test(await card.innerText()) ? 'desync' : 'defender'
  }
  const [emberRole, quillRole] = [await roleOf(ember), await roleOf(quill)]
  expect([emberRole, quillRole].sort()).toEqual(['defender', 'desync'])
  const [desync, defender, desyncName] = emberRole === 'desync' ? [ember, quill, 'Ember'] : [quill, ember, 'Quill']
  await shot(desync, '2-role-desync')
  await shot(defender, '2-role-defender')
  for (const p of [ember, quill]) await p.getByRole('button', { name: 'Dismiss role card' }).click()
  // The projector never reveals the role while playing.
  await expect(projector.getByText(new RegExp(`${desyncName}.{0,20}desync`, 'i'))).toHaveCount(0)

  // The Desync long-presses the points tile and sabotages the Rune Market
  const tile = desync.getByTitle('Open the leaderboard')
  await tile.hover()
  await desync.mouse.down()
  await desync.waitForTimeout(1_400)
  await desync.mouse.up()
  const console_ = desync.getByRole('dialog', { name: 'Console' })
  await expect(console_).toBeVisible()
  await console_.getByRole('button', { name: /Rune Market/i }).click()
  await console_.getByRole('button', { name: /Reality tear/i }).click()
  await shot(desync, '3-sabotage-console')
  await console_.getByRole('button', { name: /^Sabotage$/ }).click()
  await expect(console_.getByText(/Cooling down/i)).toBeVisible()
  await console_.getByRole('button', { name: 'Close console' }).click()
  // A defender's long-press does nothing.
  await defender.getByTitle('Open the leaderboard').hover()
  await defender.mouse.down()
  await defender.waitForTimeout(1_400)
  await defender.mouse.up()
  await expect(defender.getByRole('dialog', { name: 'Console' })).toHaveCount(0)
  await gotoReady(defender, '/report')

  // The audience reports what they see -> the hidden sabotage is discovered on the projector
  await audience.locator('#echo-text').fill('A reality tear is ripping open the sky above the Rune Market, stalls fall into the rift')
  await audience.getByRole('button', { name: 'Send echo' }).click()
  await expect(projector.getByText(/Sabotage discovered/i)).toBeVisible({ timeout: 15_000 })
  await shot(projector, '4-discovered')

  // The defender fixes it with the mini-task
  const fixList = defender.locator('section[aria-labelledby="fix-title"]')
  await expect(fixList.getByRole('button').filter({ hasText: /Rune Market|rift|tear/i }).first()).toBeVisible({ timeout: 15_000 })
  await fixList.getByRole('button').filter({ hasText: /Rune Market|rift|tear/i }).first().click()
  const task = defender.getByRole('dialog', { name: 'Fix glitch' })
  await task.getByRole('button', { name: 'Hold to channel' }).hover()
  await defender.mouse.down()
  await defender.waitForTimeout(3_200)
  await defender.mouse.up()
  await expect(task.getByText(/Tap the runes in this order/i)).toBeVisible()
  // Match the shown sequence icons to the rune buttons by their SVG paths.
  const order = await task.evaluate((root) => {
    const key = (el: Element | null) => (el?.querySelector('svg')?.innerHTML ?? '').replace(/class="[^"]*"/g, '')
    const buttons = [...root.querySelectorAll('button[aria-label]')].filter((b) => !/Cancel|Hold/.test(b.getAttribute('aria-label')!))
    const seq = [...root.querySelectorAll('span.size-16')]
    return seq.map((s) => buttons.find((b) => key(b) === key(s))?.getAttribute('aria-label') ?? null)
  })
  expect(order.every(Boolean)).toBe(true)
  for (const name of order) await task.getByRole('button', { name: name!, exact: true }).click()
  await expect(task.getByText(/Glitch fixed/i)).toBeVisible({ timeout: 10_000 })
  await shot(defender, '5-fixed')

  // Emergency meeting: the defender calls it, everyone votes
  await gotoReady(defender, '/report')
  await defender.getByRole('button', { name: /Emergency meeting/i }).click()
  await defender.getByRole('button', { name: 'Call it' }).click()
  await expect(projector.getByText(/Emergency meeting/i).first()).toBeVisible({ timeout: 10_000 })
  const voteFor = async (p: Page, who: string) => {
    const btn = p.getByRole('button', { name: new RegExp(who === 'skip' ? '^Skip' : who, 'i') }).last()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await btn.click()
  }
  await voteFor(defender, desyncName)
  await voteFor(audience, desyncName)
  await voteFor(desync, 'skip')
  await shot(projector, '6-meeting')

  // Ejection reveal, then the defenders win
  await expect(projector.getByText(new RegExp(`${desyncName}.{0,10}was the Desync`, 'i')).first()).toBeVisible({ timeout: 45_000 })
  await shot(projector, '7-ejected')
  await expect(projector.getByText(/Achrona holds/i).first()).toBeVisible({ timeout: 20_000 })
  await shot(projector, '8-defenders-win')
  await shot(defender, '8-phone-end')

  // Clean up so other tests start idle
  await gotoReady(admin, '/admin')
  const end = admin.getByRole('button', { name: /End game|Clear/i }).first()
  if (await end.isVisible()) await end.click()
})
