/** Host half: registers the profile-persisted personal-workbench namespace. */

import type { Context } from '@deepseek-ai/cordis'
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
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register(createHostNetworkProxyRoute()),
      'personal-workbench: Host network proxy diagnostic')
  })
}
