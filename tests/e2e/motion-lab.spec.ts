import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { expectMotionLabReady, monitorPageErrors } from './testPage'

test('loads the motion lab without runtime errors', async ({ page }) => {
  const errors = monitorPageErrors(page)
  await expectMotionLabReady(page)

  await expect(page.getByRole('button', { name: 'GENERATE MOTION PLAN' })).toBeEnabled()
  await expect(
    page.getByRole('button', { name: /play \d+\/\d+ motion beside robotic hands/i }),
  ).toBeEnabled()
  expect(errors).toEqual([])
})

test('generates source-backed words and visible fallback letters', async ({ page }) => {
  await expectMotionLabReady(page)
  const source = page.getByRole('textbox', { name: 'Source text for motion plan' })

  await source.fill('Thank you. Let us work together with ORCA.')
  await page.getByRole('button', { name: 'GENERATE MOTION PLAN' }).click()

  await expect(page.getByRole('button', { name: 'THANKS' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'COLLABORATE' })).toBeVisible()
  await expect(page.getByText(/2 word cues/)).toBeVisible()
  await expect(page.getByText(/word.*fingerspelled/)).toBeVisible()
})

test('keeps required two-hand cues safe and permits one-hand inspection', async ({ page }) => {
  await expectMotionLabReady(page)
  const oneHand = page.getByRole('button', { name: 'ONE HAND' })

  await expect(oneHand).toBeDisabled()
  await page.getByRole('button', { name: 'YOU' }).click()
  await expect(oneHand).toBeEnabled()
  await oneHand.click()
  await expect(oneHand).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('One-hand word cue · review required')).toBeVisible()

  await page.getByRole('button', { name: 'TWO-HAND RIG' }).click()
  await expect(page.getByRole('button', { name: 'TWO-HAND RIG' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('switches language, perspective, and playback state', async ({ page }) => {
  test.slow(Boolean(process.env.CI), 'Software-rendered 3D interactions are slower on CI runners')
  await expectMotionLabReady(page)

  await page.getByRole('button', { name: /GERMAN → DSGS/ }).click()
  await expect(page.getByText('Deutschschweizer Gebärdensprache')).toBeVisible()
  await page.getByRole('button', { name: 'LOAD DSGS WORD DEMO' }).click()
  await expect(page.getByRole('button', { name: 'KLEINE' })).toBeVisible()

  await page.getByRole('button', { name: 'SIDE / ANGLE' }).click()
  await expect(page.getByRole('button', { name: 'SIDE / ANGLE' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  const play = page.getByRole('button', { name: /play \d+\/\d+ motion beside robotic hands/i })
  await play.click()
  await expect(
    page.getByRole('button', { name: /pause \d+\/\d+ motion beside robotic hands/i }),
  ).toBeVisible()
  await page.getByRole('button', { name: /pause \d+\/\d+ motion beside robotic hands/i }).click()
})

test('has no serious accessibility violations on the primary screen', async ({ page }) => {
  await expectMotionLabReady(page)
  const results = await new AxeBuilder({ page }).analyze()
  const serious = results.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  )
  expect(serious).toEqual([])
})

test('protects the responsive control layout', async ({ page }, testInfo) => {
  await expectMotionLabReady(page)

  const scriptPanel = page.getByRole('region', { name: 'Script and motion plan' })
  const handPanel = page.getByRole('region', { name: 'ORCA robotic hand playback' })
  const [scriptBox, handBox] = await Promise.all([
    scriptPanel.boundingBox(),
    handPanel.boundingBox(),
  ])
  const viewport = page.viewportSize()

  expect(scriptBox, 'script panel should have measurable layout geometry').not.toBeNull()
  expect(handBox, 'hand panel should have measurable layout geometry').not.toBeNull()
  expect(viewport, 'test project should declare a viewport').not.toBeNull()
  if (!scriptBox || !handBox || !viewport) throw new Error('Responsive layout geometry unavailable')

  expect(scriptBox.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(handBox.width).toBeLessThanOrEqual(viewport.width + 1)
  await expect(page.getByRole('group', { name: 'Viewing perspective' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Hand mode' })).toBeVisible()

  if (testInfo.project.name === 'mobile') {
    expect(scriptBox.y).toBeGreaterThanOrEqual(handBox.y + handBox.height - 2)
  } else {
    expect(handBox.x).toBeGreaterThanOrEqual(scriptBox.x + scriptBox.width - 2)
    expect(scriptBox.height).toBeLessThanOrEqual(viewport.height + 1)
    expect(handBox.height).toBeLessThanOrEqual(viewport.height + 1)
  }

  // Pixel baselines remain useful on the platform where they were reviewed.
  // CI uses geometry contracts because font and WebGL rasterization are OS-specific.
  if (process.env.CI) return

  await expect(page).toHaveScreenshot(`motion-lab-${testInfo.project.name}.png`, {
    fullPage: false,
    mask: [page.locator('canvas')],
  })
})
