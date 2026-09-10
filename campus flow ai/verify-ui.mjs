// Optional verification: npm install --no-save --package-lock=false @playwright/test
// Start Vite, then run: node verify-ui.mjs
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
const output = process.env.TEMP ? `${process.env.TEMP}/campusflow-ui-verification` : '/tmp/campusflow-ui-verification'
await mkdir(output, { recursive: true })
try {
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const route of ['/', '/dashboard']) {
      await page.goto(`http://127.0.0.1:5173${route}`)
      await page.locator('h1').waitFor()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route} overflows at ${width}px`)
      await page.screenshot({ path: `${output}/${route === '/' ? 'landing' : 'dashboard'}-${width}.png`, fullPage: true })
    }
  }
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('button', { name: 'Open navigation', exact: true }).getAttribute('aria-expanded'), 'false')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click()
  await page.locator('.profile-button').click()
  await page.getByRole('link', { name: 'Profile & settings' }).waitFor()
  await page.keyboard.press('Escape')
  await page.getByText('Why this?', { exact: true }).click()
  assert.equal(await page.locator('.recommendation-footer details').getAttribute('open'), '')
  await page.getByRole('button', { name: 'completed', exact: true }).click()
  assert.equal(await page.locator('.task-item').count(), 1)
  await page.getByRole('button', { name: 'pending', exact: true }).click()
  assert.equal(await page.locator('.task-item').count(), 3)
  await page.getByRole('checkbox').first().click()
  await page.getByRole('status').filter({ hasText: 'account is connected' }).waitFor()
  assert.equal(await page.getByRole('checkbox').first().isChecked(), false)
  await page.getByRole('textbox', { name: 'Search navigation' }).fill('attendance')
  await page.locator('.search-results').getByRole('link', { name: 'Attendance' }).click()
  assert.ok(page.url().endsWith('/attendance'))
  for (const state of ['loading', 'empty', 'error', 'partial']) {
    await page.goto(`http://127.0.0.1:5173/dashboard?state=${state}`)
    if (state === 'loading') assert.ok(await page.getByRole('status', { name: 'Loading section' }).count() > 0)
    if (state === 'empty') await page.getByText('Attendance not yet uploaded.', { exact: true }).waitFor()
    if (state === 'error') assert.ok(await page.getByRole('alert').count() > 0)
    if (state === 'partial') { await page.getByText('Data Structures', { exact: true }).waitFor(); await page.getByText('No important notices to review.').waitFor() }
  }
  assert.deepEqual(errors, [], 'Browser console or runtime errors')
  console.log(`PASS: 8 responsive views, navigation, profile, recommendation, filters, callback boundary, 4 data states, and no console errors. Screenshots: ${output}`)
} finally { await browser.close() }
