/** Fixed browser-to-desktop protocol for shell environment and macOS privacy status. */

export const DESKTOP_ENVIRONMENT_CHANNEL = 'yourbuddy.desktop.environment'
export const DESKTOP_ENVIRONMENT_VERSION = 1

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const DEFAULT_HANDSHAKE_TIMEOUT_MS = 5_000
const MAX_TEXT_LENGTH = 4_096

/** User-selectable startup environment source. */
export type ShellEnvironmentMode = 'inherit' | 'desktopOnly'

/** Persisted shell environment selection. */
export interface ShellEnvironmentSettings {
  mode: ShellEnvironmentMode
  shellPath: string | null
}

/** Redacted result of one shell capture. */
export interface ShellEnvironmentStatus {
  state: 'ready' | 'desktopOnly' | 'timedOut' | 'failed'
  source: 'loginShell' | 'desktop'
  shellPath: string
  durationMs: number
  variableCount: number
  pathEntryCount: number
  errorCode: string
}

/** Availability of one executable in the effective application environment. */
export interface ShellToolStatus {
  name: 'git' | 'python3' | 'ffmpeg' | 'ffprobe'
  available: boolean
}

/** Current environment settings and redacted startup result. */
export interface ShellEnvironmentSnapshot {
  settings: ShellEnvironmentSettings
  status: ShellEnvironmentStatus
  restartRequired: boolean
  overriddenNames: string[]
  tools: ShellToolStatus[]
}

/** macOS privacy item shown in General settings. */
export interface MacosPermissionState {
  id: MacosPermissionId
  status: 'granted' | 'denied' | 'notDetermined' | 'restricted' | 'notApplicable' | 'unknown'
  owner: 'yourBuddy' | 'externalFfmpeg' | 'macOS'
  canRequest: boolean
  canOpenSettings: boolean
}

/** Permission ids accepted by the native service. */
export type MacosPermissionId =
  | 'accessibility'
  | 'microphone'
  | 'screenRecording'
  | 'fullDiskAccess'
  | 'notifications'

type EnvironmentAction =
  | 'get'
  | 'preview'
  | 'save'
  | 'get-permissions'
  | 'request-permission'
  | 'open-permission-settings'

type EnvironmentValue = ShellEnvironmentSnapshot | MacosPermissionState[] | null

/** Options for one desktop environment request. */
export interface DesktopEnvironmentRequestOptions {
  target?: Window
  requestId?: string
  handshakeTimeoutMs?: number
  completionTimeoutMs?: number
}

function createRequestId(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, expected: string): boolean {
  return Object.keys(value).sort().join(',') === expected
}

/** Report whether the product Client is embedded in a desktop shell. */
export function isDesktopEnvironmentAvailable(
  target: Window | undefined = typeof window === 'undefined' ? undefined : window,
): boolean {
  return target !== undefined && target.parent !== target
}

/** Validate shell settings received across the desktop bridge. */
export function readShellEnvironmentSettings(value: unknown): ShellEnvironmentSettings | undefined {
  if (!isRecord(value)
    || !hasExactKeys(value, 'mode,shellPath')
    || !['inherit', 'desktopOnly'].includes(String(value.mode))
    || (value.shellPath !== null
      && (typeof value.shellPath !== 'string'
        || value.shellPath.length > MAX_TEXT_LENGTH
        || value.shellPath.includes('\0')))) return undefined
  return { mode: value.mode as ShellEnvironmentMode, shellPath: value.shellPath as string | null }
}

function readStatus(value: unknown): ShellEnvironmentStatus | undefined {
  if (!isRecord(value)
    || !hasExactKeys(value, 'durationMs,errorCode,pathEntryCount,shellPath,source,state,variableCount')
    || !['ready', 'desktopOnly', 'timedOut', 'failed'].includes(String(value.state))
    || !['loginShell', 'desktop'].includes(String(value.source))
    || typeof value.shellPath !== 'string'
    || value.shellPath.length > MAX_TEXT_LENGTH
    || !Number.isSafeInteger(value.durationMs)
    || Number(value.durationMs) < 0
    || !Number.isSafeInteger(value.variableCount)
    || Number(value.variableCount) < 0
    || Number(value.variableCount) > 8_192
    || !Number.isSafeInteger(value.pathEntryCount)
    || Number(value.pathEntryCount) < 0
    || Number(value.pathEntryCount) > 8_192
    || typeof value.errorCode !== 'string'
    || !/^[a-z0-9-]{0,64}$/u.test(value.errorCode)) return undefined
  return {
    state: value.state as ShellEnvironmentStatus['state'],
    source: value.source as ShellEnvironmentStatus['source'],
    shellPath: value.shellPath,
    durationMs: Number(value.durationMs),
    variableCount: Number(value.variableCount),
    pathEntryCount: Number(value.pathEntryCount),
    errorCode: value.errorCode,
  }
}

function readTools(value: unknown): ShellToolStatus[] | undefined {
  if (!Array.isArray(value) || value.length !== 4) return undefined
  const result: ShellToolStatus[] = []
  for (const item of value) {
    if (!isRecord(item)
      || !hasExactKeys(item, 'available,name')
      || !['git', 'python3', 'ffmpeg', 'ffprobe'].includes(String(item.name))
      || typeof item.available !== 'boolean') return undefined
    result.push({ name: item.name as ShellToolStatus['name'], available: item.available })
  }
  return result
}

/** Validate one redacted environment snapshot. */
export function readShellEnvironmentSnapshot(value: unknown): ShellEnvironmentSnapshot | undefined {
  if (!isRecord(value)
    || !hasExactKeys(value, 'overriddenNames,restartRequired,settings,status,tools')
    || typeof value.restartRequired !== 'boolean'
    || !Array.isArray(value.overriddenNames)
    || value.overriddenNames.length > 16
    || !value.overriddenNames.every(name => typeof name === 'string' && name.length <= 64)) return undefined
  const settings = readShellEnvironmentSettings(value.settings)
  const status = readStatus(value.status)
  const tools = readTools(value.tools)
  if (settings === undefined || status === undefined || tools === undefined) return undefined
  return {
    settings,
    status,
    restartRequired: value.restartRequired,
    overriddenNames: value.overriddenNames as string[],
    tools,
  }
}

/** Validate macOS privacy status returned by the native shell. */
export function readMacosPermissions(value: unknown): MacosPermissionState[] | undefined {
  if (!Array.isArray(value) || (value.length !== 0 && value.length !== 5)) return undefined
  const result: MacosPermissionState[] = []
  const ids = new Set<MacosPermissionId>()
  for (const item of value) {
    if (!isRecord(item)
      || !hasExactKeys(item, 'canOpenSettings,canRequest,id,owner,status')
      || !['accessibility', 'microphone', 'screenRecording', 'fullDiskAccess', 'notifications'].includes(String(item.id))
      || !['granted', 'denied', 'notDetermined', 'restricted', 'notApplicable', 'unknown'].includes(String(item.status))
      || !['yourBuddy', 'externalFfmpeg', 'macOS'].includes(String(item.owner))
      || typeof item.canRequest !== 'boolean'
      || typeof item.canOpenSettings !== 'boolean') return undefined
    const id = item.id as MacosPermissionId
    if (ids.has(id)) return undefined
    ids.add(id)
    result.push({
      id,
      status: item.status as MacosPermissionState['status'],
      owner: item.owner as MacosPermissionState['owner'],
      canRequest: item.canRequest,
      canOpenSettings: item.canOpenSettings,
    })
  }
  return result
}

function readResponse(
  value: unknown,
  requestId: string,
  action: EnvironmentAction,
): { accepted: boolean, ok?: boolean, value?: EnvironmentValue, error?: string } | undefined {
  if (!isRecord(value)
    || value.channel !== DESKTOP_ENVIRONMENT_CHANNEL
    || value.version !== DESKTOP_ENVIRONMENT_VERSION
    || value.requestId !== requestId) return undefined
  if (value.type === `${action}-accepted`) {
    return hasExactKeys(value, 'channel,requestId,type,version') ? { accepted: true } : undefined
  }
  if (value.type !== `${action}-response` || typeof value.ok !== 'boolean') return undefined
  if (!value.ok) {
    if (!hasExactKeys(value, 'channel,error,ok,requestId,type,version')
      || typeof value.error !== 'string'
      || value.error.length > MAX_TEXT_LENGTH) return undefined
    return { accepted: false, ok: false, error: value.error }
  }
  if (!hasExactKeys(value, 'channel,ok,requestId,type,value,version')) return undefined
  const parsed = action === 'get-permissions' || action === 'request-permission'
    ? readMacosPermissions(value.value)
    : action === 'open-permission-settings'
      ? value.value === null ? null : undefined
      : readShellEnvironmentSnapshot(value.value)
  if (parsed === undefined) return undefined
  return { accepted: false, ok: true, value: parsed }
}

function completionTimeoutMs(action: EnvironmentAction): number {
  return action === 'request-permission' ? 130_000 : action === 'preview' ? 15_000 : 10_000
}

function requestDesktopEnvironment(
  action: EnvironmentAction,
  data: { settings?: ShellEnvironmentSettings, permission?: MacosPermissionId },
  options: DesktopEnvironmentRequestOptions,
): Promise<EnvironmentValue> {
  const target = options.target ?? window
  if (!isDesktopEnvironmentAvailable(target)) return Promise.reject(new Error('desktop-shell-unavailable'))
  const requestId = options.requestId ?? createRequestId()
  if (!REQUEST_ID_PATTERN.test(requestId)) return Promise.reject(new Error('desktop-environment-request-id-invalid'))
  if (data.settings !== undefined && readShellEnvironmentSettings(data.settings) === undefined) {
    return Promise.reject(new Error('desktop-environment-settings-invalid'))
  }

  return new Promise((resolve, reject) => {
    const parent = target.parent
    let handshakeTimeout: number | undefined
    let completionTimeout: number | undefined
    const cleanup = (): void => {
      if (handshakeTimeout !== undefined) target.clearTimeout(handshakeTimeout)
      if (completionTimeout !== undefined) target.clearTimeout(completionTimeout)
      handshakeTimeout = undefined
      completionTimeout = undefined
      target.removeEventListener('message', onMessage)
    }
    const onMessage = (event: MessageEvent<unknown>): void => {
      if (event.source !== parent) return
      const response = readResponse(event.data, requestId, action)
      if (response === undefined) return
      if (response.accepted) {
        if (handshakeTimeout !== undefined) target.clearTimeout(handshakeTimeout)
        handshakeTimeout = undefined
        completionTimeout = target.setTimeout(() => {
          cleanup()
          reject(new Error(`desktop-environment-${action}-timeout`))
        }, options.completionTimeoutMs ?? completionTimeoutMs(action))
        return
      }
      cleanup()
      if (response.ok) resolve(response.value ?? null)
      else reject(new Error(response.error ?? `desktop-environment-${action}-failed`))
    }
    handshakeTimeout = target.setTimeout(() => {
      cleanup()
      reject(new Error('desktop-shell-unavailable'))
    }, options.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS)
    target.addEventListener('message', onMessage)
    parent.postMessage({
      channel: DESKTOP_ENVIRONMENT_CHANNEL,
      version: DESKTOP_ENVIRONMENT_VERSION,
      type: `${action}-request`,
      requestId,
      ...data,
    }, '*')
  })
}

/** Load the current startup environment state. */
export async function requestShellEnvironmentSnapshot(
  options: DesktopEnvironmentRequestOptions = {},
): Promise<ShellEnvironmentSnapshot> {
  return await requestDesktopEnvironment('get', {}, options) as ShellEnvironmentSnapshot
}

/** Preview a shell selection without changing the process or saved settings. */
export async function requestShellEnvironmentPreview(
  settings: ShellEnvironmentSettings,
  options: DesktopEnvironmentRequestOptions = {},
): Promise<ShellEnvironmentSnapshot> {
  return await requestDesktopEnvironment('preview', { settings }, options) as ShellEnvironmentSnapshot
}

/** Save the shell selection for the next application launch. */
export async function requestShellEnvironmentSave(
  settings: ShellEnvironmentSettings,
  options: DesktopEnvironmentRequestOptions = {},
): Promise<ShellEnvironmentSnapshot> {
  return await requestDesktopEnvironment('save', { settings }, options) as ShellEnvironmentSnapshot
}

/** Refresh macOS privacy status without prompting. */
export async function requestMacosPermissions(
  options: DesktopEnvironmentRequestOptions = {},
): Promise<MacosPermissionState[]> {
  return await requestDesktopEnvironment('get-permissions', {}, options) as MacosPermissionState[]
}

/** Request one application-owned macOS permission after a user click. */
export async function requestMacosPermission(
  permission: MacosPermissionId,
  options: DesktopEnvironmentRequestOptions = {},
): Promise<MacosPermissionState[]> {
  return await requestDesktopEnvironment('request-permission', { permission }, options) as MacosPermissionState[]
}

/** Open the fixed System Settings pane for one permission. */
export async function openMacosPermissionSettings(
  permission: MacosPermissionId,
  options: DesktopEnvironmentRequestOptions = {},
): Promise<void> {
  await requestDesktopEnvironment('open-permission-settings', { permission }, options)
}
