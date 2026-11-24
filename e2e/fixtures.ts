/**
 * @file Shared E2E fixtures: fail on uncaught page errors, plus login / quick-join helpers.
 * @exports test, expect, gotoReady, login, quickJoin
 */
import { test as base, expect, type Page } from '@playwright/test'

export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await use(errors)
      expect(errors, 'uncaught errors in the page').toEqual([])
    },
    { auto: true },
  ],
})
export { expect }

/** Navigate and wait until React has hydrated (inputs typed earlier get reset by hydration). */
export async function gotoReady(page: Page, url: string) {
  await page.goto(url)
  await page.locator('html[data-hydrated="true"]').waitFor()
}

export async function login(page: Page, codename: string, password = 'achrona') {
  await gotoReady(page, '/login')
  await page.getByLabel('Codename').fill(codename)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Enter mission control' }).click()
  await expect(page).not.toHaveURL(/\/login/)
  // Wait for the post-login client navigation to settle before the caller navigates again.
  await expect(page.getByRole('navigation').first()).toBeVisible()
  await page.waitForLoadState('load')
}

/** Quick-joins as a new passwordless defender; returns the generated codename's page (lands on /report). */
export async function quickJoin(page: Page) {
  await gotoReady(page, '/join')
  await page.getByRole('button', { name: 'Join the defense' }).click()
  await expect(page).toHaveURL(/\/report/)
  await page.locator('html[data-hydrated="true"]').waitFor()
}
