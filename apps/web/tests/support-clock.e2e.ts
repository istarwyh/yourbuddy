import { chromium } from 'playwright'
import { expect, it, vi, type MockInstance } from 'vitest'
import { newEnglishPage, pinBrowserClock, WEB_FIXTURE_TIME } from './support.ts'

it('keeps frame and nested timer callbacks live when the Host clock is pinned', async () => {
  const browser = await chromium.launch()
  let hostClock: MockInstance<typeof Date.now> | undefined
  try {
    const page = await newEnglishPage(browser)
    const browserNow = await page.evaluate(() => Date.now())
    const startedAt = performance.now()
    // A Host/browser gap just over signed timer range reproduces the old clock's
    // negative native delay wrapping into a many-day wait, on any calendar day.
    hostClock = vi.spyOn(Date, 'now').mockImplementation(() =>
      browserNow - (2 ** 31 + 1_000) + Math.floor(performance.now() - startedAt))
    await pinBrowserClock(page)
    const html = '<p id="result">pending</p><script>requestAnimationFrame(() => setTimeout(() => { document.querySelector("#result").textContent = String(Date.now()) }, 0))</script>'
    await page.goto(`data:text/html,${encodeURIComponent(html)}`)
    await expect.poll(() => page.locator('#result').textContent(), { timeout: 5_000 }).not.toBe('pending')
    const completedAt = Number(await page.locator('#result').textContent())
    expect(completedAt).toBeGreaterThanOrEqual(WEB_FIXTURE_TIME)
    expect(completedAt).toBeLessThan(WEB_FIXTURE_TIME + 10_000)
    expect(await page.evaluate(() => performance.now())).toBeLessThan(10_000)

    await page.close()
    const nextPage = await newEnglishPage(browser)
    expect(await nextPage.evaluate(() => Date.now())).toBeGreaterThanOrEqual(browserNow)
  } finally {
    hostClock?.mockRestore()
    await browser.close()
  }
})
