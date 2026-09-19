/** Durable personal-workbench settings shared by the Host schema and browser client. */

import Schema from '@deepseek-ai/schemastery'

export { WORKBENCH_SETTINGS_NAMESPACE } from './constants.ts'

/** Durable settings for the user-owned workbench identity. */
export interface WorkbenchSettings {
  /** Whether custom occupants replace the shell's brand fallbacks. */
  enabled: boolean
  /** Plain-text workbench name. */
  name: string
  /** Image source used by the browser brand slots. */
  logo: string
  /** Blank-session headline override; an empty value keeps the localized default. */
  heroHeadline: string
  /** Blank-session badge override; an empty value keeps the localized default. */
  heroBadge: string
  /** Whether the blank-session badge is visible. */
  showHeroBadge: boolean
}

/** Host schema for profile-persisted branding. */
export const WorkbenchSettingsSchema: Schema<WorkbenchSettings> = Schema.object({
  enabled: Schema.boolean().default(false),
  name: Schema.string().default(''),
  logo: Schema.string().default(''),
  heroHeadline: Schema.string().default(''),
  heroBadge: Schema.string().default(''),
  showHeroBadge: Schema.boolean().default(true),
})
