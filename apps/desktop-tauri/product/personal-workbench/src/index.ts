/** Host half: registers the profile-persisted personal-workbench namespace. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-app-boot'
import { createCapabilityPackRoute, installCapabilityPackReconciler } from './capability-pack.ts'
import { createHostNetworkProxyRoute } from './host-network-proxy.ts'
import { WorkbenchSettingsSchema } from './settings.ts'

export {
  WorkbenchSettingsSchema, WORKBENCH_SETTINGS_NAMESPACE,
  type WorkbenchSettings,
} from './settings.ts'

/** Cordis plugin name. */
export const name = 'personal-workbench'

/** Loader configuration projected into the shared settings forms. */
export const Config = WorkbenchSettingsSchema

/** Register the product's Host network diagnostic route. */
export function apply(ctx: Context): void {
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
