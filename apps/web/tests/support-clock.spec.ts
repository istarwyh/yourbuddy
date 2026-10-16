import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'
import type { Page } from 'playwright'
import { pinBrowserClock, pinHostClock, WEB_FIXTURE_TIME } from './support.ts'

it('pins each document wall clock without replacing its timers or monotonic clock', async () => {
  const dispose = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const addInitScript = vi.fn<Page['addInitScript']>().mockResolvedValue({ dispose, [Symbol.asyncDispose]: dispose })
  const hostClock = pinHostClock()
  try {
    await pinBrowserClock({ addInitScript })
    expect(addInitScript).toHaveBeenCalledTimes(1)
    const [script, argument] = addInitScript.mock.calls[0]!
    if (typeof script !== 'function') throw new Error('clock initialization must be a browser function')
    const initialization = `(${script.toString()})(${JSON.stringify(argument)})`
    for (const initialTicks of [0, 50_000]) {
      let ticks = initialTicks
      const monotonic = { now: () => ticks }
      const timer = vi.fn()
      const scope = { performance: monotonic, setTimeout: timer, setInterval: timer, requestAnimationFrame: timer }
      const clock = runInNewContext(`
        const nativeDate = Date;
        const nativeIntl = Intl;
        ${initialization};
        ({ now: () => Date.now(), nativeDatePreserved: Date === nativeDate,
          nativeIntlPreserved: Intl === nativeIntl,
          performance, setTimeout, setInterval, requestAnimationFrame })
      `, scope) as {
        now(): number
        nativeDatePreserved: boolean
        nativeIntlPreserved: boolean
        performance: typeof monotonic
        setTimeout: typeof timer
        setInterval: typeof timer
        requestAnimationFrame: typeof timer
      }
      expect(clock.now()).toBe(WEB_FIXTURE_TIME)
      ticks += 37.9
      expect(clock.now()).toBe(WEB_FIXTURE_TIME + 37)
      expect(clock.nativeDatePreserved).toBe(true)
      expect(clock.nativeIntlPreserved).toBe(true)
      expect(clock.performance).toBe(monotonic)
      expect(clock.setTimeout).toBe(timer)
      expect(clock.setInterval).toBe(timer)
      expect(clock.requestAnimationFrame).toBe(timer)
      expect(timer).not.toHaveBeenCalled()
    }
  } finally {
    hostClock.mockRestore()
  }
})
