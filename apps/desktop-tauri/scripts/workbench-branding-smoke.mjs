/** Keyless branding journey through the assembled product's persistent settings. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const expected = JSON.parse(readFileSync(new URL('./snapshots/workbench-branding.json', import.meta.url), 'utf8'))
const artwork = readFileSync(new URL('../app-icon.svg', import.meta.url), 'utf8').trim()
const uploadedLogo = new URL('../app-icon.png', import.meta.url)

/**
 * Exercise product defaults, custom name and Logo persistence, and reset.
 * @param {import('playwright').Page} page - assembled workbench with an isolated Profile.
 * @returns {Promise<void>}
 */
export async function verifyWorkbenchBranding(page) {
  const manifest = await (await page.request.get(new URL('/manifest.webmanifest', page.url()).href)).json()
  assert.equal(manifest.name, 'YourHarness')
  assert.equal(manifest.short_name, 'YourHarness')
  const favicon = await (await page.request.get(new URL('/favicon.svg', page.url()).href)).text()
  assert.equal(favicon.trim(), artwork)
  const observed = []
  const capture = async (step, name, logo) => {
    const brand = page.getByRole('button', { name: 'New session', exact: true }).filter({ hasText: name }).first()
    await brand.waitFor({ timeout: 10_000 })
    const image = brand.locator('img')
    await image.waitFor({ timeout: 10_000 })
    await image.evaluate(image => image.decode())
    const source = await image.getAttribute('src')
    if (logo === 'YH') {
      const comma = source.indexOf(',')
      const svg = source.slice(0, comma).includes(';base64')
        ? Buffer.from(source.slice(comma + 1), 'base64').toString('utf8')
        : decodeURIComponent(source.slice(comma + 1))
      assert.equal(svg.trim(), artwork, 'workbench must render the canonical product artwork')
    } else {
      assert.equal(source, `data:image/png;base64,${readFileSync(uploadedLogo).toString('base64')}`)
    }
    observed.push({ step, title: await page.title(), name: (await brand.textContent()).trim(), logo })
  }
  const openSettings = async () => {
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
    if (!await settings.isVisible()) await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await settings.waitFor({ timeout: 10_000 })
    return settings
  }

  await capture('default', 'YourHarness', 'YH')
  let settings = await openSettings()
  await settings.getByRole('textbox', { name: 'Workbench name', exact: true }).fill('Research Lab')
  await settings.locator('input[type="file"]').setInputFiles(fileURLToPath(uploadedLogo))
  await settings.getByText('Replace image', { exact: true }).waitFor()
  await settings.getByRole('button', { name: 'Apply to workbench', exact: true }).click()
  await settings.getByText('Applied', { exact: true }).waitFor()
  await capture('custom', 'Research Lab', 'uploaded')
  await page.reload({ waitUntil: 'load' })
  await capture('reloaded', 'Research Lab', 'uploaded')
  settings = await openSettings()
  await settings.getByRole('button', { name: 'Restore YourHarness default', exact: true }).click()
  await settings.getByText('Default restored', { exact: true }).waitFor()
  await capture('reset', 'YourHarness', 'YH')
  await page.reload({ waitUntil: 'load' })
  await capture('reset-reloaded', 'YourHarness', 'YH')
  assert.deepEqual(observed, expected)
  console.log('workbench-branding: default, customization, persistence, and reset snapshot passed')
}
