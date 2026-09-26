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
  assert.equal(manifest.name, 'YourBuddy')
  assert.equal(manifest.short_name, 'YourBuddy')
  const favicon = await (await page.request.get(new URL('/favicon.svg', page.url()).href)).text()
  assert.equal(favicon.trim(), artwork)
  const observed = []
  const capture = async (step, name, logo) => {
    const brandButtons = page.getByRole('button', { name: 'New session', exact: true })
    const brand = brandButtons.filter({ hasText: name }).first()
    try {
      await brand.waitFor({ timeout: 10_000 })
    }
    catch (error) {
      const visibleNames = await brandButtons.allTextContents()
      const settingsView = await page.evaluate(async () => {
        const response = await fetch('/api/settings/describe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            type: 'client-request',
            rpcId: 'yourbuddy-release-brand-settings',
            method: 'settings/describe',
            payload: { args: {} },
          }),
        })
        return await response.json()
      })
      throw new Error(`workbench brand ${JSON.stringify(name)} was not visible; New session buttons: ${JSON.stringify(visibleNames)}; settings: ${JSON.stringify(settingsView)}`, { cause: error })
    }
    const image = brand.locator('img')
    await image.waitFor({ timeout: 10_000 })
    await image.evaluate(image => image.decode())
    const source = await image.getAttribute('src')
    if (logo === 'Y8') {
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

  await capture('default', 'YourBuddy', 'Y8')
  let settings = await openSettings()
  await settings.getByRole('textbox', { name: 'Workbench name', exact: true }).fill('Research Lab')
  await settings.locator('input[type="file"]').setInputFiles(fileURLToPath(uploadedLogo))
  await settings.getByText('Replace image', { exact: true }).waitFor()
  const mutationResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/settings/mutate')
  await settings.getByRole('button', { name: 'Apply to workbench', exact: true }).click()
  const mutation = await mutationResponse
  const mutationBody = await mutation.text()
  try {
    await settings.getByText('Applied', { exact: true }).waitFor()
  }
  catch (error) {
    const body = await settings.textContent()
    const settingsView = await page.evaluate(async () => {
      const response = await fetch('/api/settings/describe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'client-request',
          rpcId: 'yourbuddy-release-brand-settings',
          method: 'settings/describe',
          payload: { args: {} },
        }),
      })
      return await response.json()
    })
    throw new Error(`workbench branding update did not apply; mutation: HTTP ${mutation.status()} ${mutationBody}; settings dialog: ${JSON.stringify(body)}; settings: ${JSON.stringify(settingsView)}`, { cause: error })
  }
  await capture('custom', 'Research Lab', 'uploaded')
  await page.reload({ waitUntil: 'load' })
  await capture('reloaded', 'Research Lab', 'uploaded')
  settings = await openSettings()
  await settings.getByRole('button', { name: 'Restore YourBuddy default', exact: true }).click()
  await settings.getByText('Default restored', { exact: true }).waitFor()
  await capture('reset', 'YourBuddy', 'Y8')
  await page.reload({ waitUntil: 'load' })
  await capture('reset-reloaded', 'YourBuddy', 'Y8')
  assert.deepEqual(observed, expected)
  console.log('workbench-branding: default, customization, persistence, and reset snapshot passed')
}
