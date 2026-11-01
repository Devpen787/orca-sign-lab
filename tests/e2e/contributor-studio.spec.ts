import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { join } from 'node:path'
import { monitorPageErrors } from './testPage'

test('creates and reloads a private Sign Pack draft', async ({ page }) => {
  const errors = monitorPageErrors(page)
  await page.goto('/#studio')
  await expect(page.getByText('SIGN PACK CONTRIBUTOR STUDIO')).toBeVisible()

  await page.getByRole('button', { name: 'SAVE LOCAL DRAFT' }).click()
  await expect(page.getByRole('status')).toContainText('SAVED PRIVATELY')
  await expect(page.getByText('1 LOCAL')).toBeVisible()

  await page.reload()
  await expect(page.getByText('1 LOCAL')).toBeVisible()
  await expect(page.getByRole('button', { name: /^HELLO ASL/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('has no serious accessibility violations in the studio', async ({ page }) => {
  await page.goto('/#studio')
  await expect(page.getByText('SIGN PACK CONTRIBUTOR STUDIO')).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  const serious = results.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  )
  expect(serious).toEqual([])
})

test('imports, configures, previews, exports, and removes a private pack', async ({ page }) => {
  test.slow(Boolean(process.env.CI), 'Software-rendered 3D interactions are slower on CI runners')
  const errors = monitorPageErrors(page)
  await page.goto('/#studio')
  await expect(page.getByText('SIGN PACK CONTRIBUTOR STUDIO')).toBeVisible()

  await page
    .getByLabel('Import Sign Pack JSON')
    .setInputFiles(join(process.cwd(), 'tests/fixtures/signpacks/asl-hello.valid.signpack.json'))
  await expect(page.getByRole('status')).toContainText('IMPORTED ASL-HELLO')
  await expect(page.getByText('1 LOCAL')).toBeVisible()

  await page.getByRole('button', { name: 'TWO-HAND RIG' }).click()
  await expect(page.getByRole('group', { name: /SUPPORT HAND/ })).toBeVisible()
  await page.getByRole('button', { name: 'ANGLE' }).click()
  await expect(page.getByRole('button', { name: 'ANGLE' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(page.getByRole('button', { name: 'BACK' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'PREVIEW', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('PREVIEWING MECHANICAL CUE')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'EXPORT SIGN PACK' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('asl-hello.signpack.json')
  await expect(page.getByRole('status')).toContainText('EXPORTED ASL-HELLO.SIGNPACK.JSON')

  await page.getByRole('button', { name: 'Delete HELLO local draft' }).click()
  await expect(page.getByText('NO LOCAL DRAFTS YET')).toBeVisible()
  expect(errors).toEqual([])
})
