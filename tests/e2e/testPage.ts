import { expect, type Page } from '@playwright/test'

export function monitorPageErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

export async function expectMotionLabReady(page: Page) {
  await page.goto('/')
  await expect(page).toHaveTitle(/ORCA Hand Sign Lab/)
  await expect(page.getByRole('heading', { name: /ROBOTIC SIGN MOTION LAB/ })).toBeVisible()
  await expect(page.getByText('ORCA MODEL READY', { exact: true })).toBeVisible({ timeout: 20_000 })
}
