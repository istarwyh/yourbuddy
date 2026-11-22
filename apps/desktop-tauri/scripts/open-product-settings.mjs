/** Settings navigation shared by the prepared product and workbench branding acceptance. */

/**
 * Open Settings through the account launcher in the Web and desktop acceptance phases.
 * @param {import('playwright').Page | import('playwright').FrameLocator} page Page or embedded frame exposing the launcher.
 * @returns {Promise<void>} Resolves when the Settings dialog is visible.
 */
export async function openProductSettings(page) {
  await page.getByRole('button', { name: 'Account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click()
  await page.getByRole('dialog', { name: 'Settings', exact: true }).waitFor({ timeout: 10_000 })
}
