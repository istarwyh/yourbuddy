/** Host registration for workbench settings, diagnostics, and desktop-owned upgrades. */

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-app-boot'
import { createCapabilityPackRoute, installCapabilityPackReconciler } from './capability-pack.ts'
import { createHostNetworkProxyRoute } from './host-network-proxy.ts'
import { WorkbenchSettingsSchema } from './settings.ts'
import { installSelfUpgrade, UpgradePolicySchema, type UpgradePolicy } from './self-upgrade.ts'

export {
  WorkbenchSettingsSchema, WORKBENCH_SETTINGS_NAMESPACE,
  type WorkbenchSettings,
} from './settings.ts'

/** Cordis plugin name. */
export const name = 'personal-workbench'

/** Loader configuration projected into the shared settings forms. */
export const Config = Schema.object({ ...WorkbenchSettingsSchema.dict, upgrade: UpgradePolicySchema })

/**
 * Register product diagnostics and installation-bound upgrade controls.
 * @param ctx - Product plugin scope.
 * @param config - Loader-resolved settings and native upgrade budgets.
 */
export function apply(ctx: Context, config: { upgrade: UpgradePolicy }): void {
  const executable = process.env.YOURBUDDY_DESKTOP_EXECUTABLE
  const app = process.env.YOURBUDDY_DESKTOP_APP
  if (executable !== undefined && app !== undefined) {
    ctx.inject(['agents', 'tools', 'sessions', 'sessionPersistence', 'jobs'], upgradeCtx => {
      installSelfUpgrade(upgradeCtx, { executable, app }, config.upgrade)
    })
  }
  const profile = ctx.get('profileContext')
  if (profile !== undefined) installCapabilityPackReconciler(ctx, profile)
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register(createHostNetworkProxyRoute()),
      'personal-workbench: Host network proxy diagnostic')
    const binDir = process.env.YOURBUDDY_BIN_DIR
    if (binDir !== undefined) {
      webCtx.effect(() => webCtx.webServer.register(createCapabilityPackRoute(binDir)),
        'personal-workbench: Capability Pack diagnostics')
    }
  })
}
