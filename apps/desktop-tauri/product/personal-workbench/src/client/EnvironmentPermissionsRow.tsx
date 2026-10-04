/** General-settings card for startup environment and macOS privacy status. */

import { useEffect, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  isDesktopEnvironmentAvailable,
  openMacosPermissionSettings,
  requestMacosPermission,
  requestMacosPermissions,
  requestShellEnvironmentPreview,
  requestShellEnvironmentSave,
  requestShellEnvironmentSnapshot,
  type MacosPermissionId,
  type MacosPermissionState,
  type ShellEnvironmentSettings,
  type ShellEnvironmentSnapshot,
} from './desktop-environment.ts'
import { requestDesktopRestart } from './desktop-lifecycle.ts'

/** Composed props for the environment and permissions settings item. */
export type EnvironmentPermissionsRowProps =
  PropsRuntime<'settings.general.item'> & PropsLocale<'settings.personal-workbench'>

type BusyAction = 'loading' | 'preview' | 'save' | 'restart' | 'refresh-permissions' | MacosPermissionId | null

const DEFAULT_SETTINGS: ShellEnvironmentSettings = { mode: 'inherit', shellPath: null }

/** Render the desktop-owned shell environment and macOS privacy state. */
export function EnvironmentPermissionsRow({ t }: EnvironmentPermissionsRowProps) {
  const [available] = useState(() => isDesktopEnvironmentAvailable())
  const [snapshot, setSnapshot] = useState<ShellEnvironmentSnapshot | null>(null)
  const [draft, setDraft] = useState<ShellEnvironmentSettings>(DEFAULT_SETTINGS)
  const [permissions, setPermissions] = useState<MacosPermissionState[]>([])
  const [busy, setBusy] = useState<BusyAction>(available ? 'loading' : null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!available) return
    let active = true
    void Promise.all([requestShellEnvironmentSnapshot(), requestMacosPermissions()])
      .then(([environment, privacy]) => {
        if (!active) return
        setSnapshot(environment)
        setDraft(environment.settings)
        setPermissions(privacy)
        setBusy(null)
      })
      .catch(error => {
        if (!active) return
        setNotice(localizedError(error, t))
        setBusy(null)
      })
    return () => { active = false }
  }, [available])

  if (!available) {
    return <section className="dpw-card">
      <div className="dpw-title">{t('environment.title')}</div>
      <div className="dpw-description">{t('environment.desktop-only')}</div>
    </section>
  }

  const preview = async (): Promise<void> => {
    setBusy('preview')
    setNotice('')
    try {
      const result = await requestShellEnvironmentPreview(draft)
      setSnapshot(result)
      setNotice(t(['failed', 'timedOut'].includes(result.status.state)
        ? 'environment.preview.failed'
        : 'environment.preview.ready'))
    }
    catch (error) { setNotice(localizedError(error, t)) }
    finally { setBusy(null) }
  }

  const save = async (): Promise<void> => {
    setBusy('save')
    setNotice('')
    try {
      const result = await requestShellEnvironmentSave(draft)
      setSnapshot(result)
      setNotice(t('environment.saved'))
    }
    catch (error) { setNotice(localizedError(error, t)) }
    finally { setBusy(null) }
  }

  const restart = async (): Promise<void> => {
    setBusy('restart')
    try { await requestDesktopRestart() }
    catch (error) {
      setNotice(localizedError(error, t))
      setBusy(null)
    }
  }

  const refreshPermissions = async (): Promise<void> => {
    setBusy('refresh-permissions')
    setNotice('')
    try { setPermissions(await requestMacosPermissions()) }
    catch (error) { setNotice(localizedError(error, t)) }
    finally { setBusy(null) }
  }

  const requestPermission = async (id: MacosPermissionId): Promise<void> => {
    setBusy(id)
    setNotice('')
    try { setPermissions(await requestMacosPermission(id)) }
    catch (error) { setNotice(localizedError(error, t)) }
    finally { setBusy(null) }
  }

  const openSettings = async (id: MacosPermissionId): Promise<void> => {
    setBusy(id)
    setNotice('')
    try { await openMacosPermissionSettings(id) }
    catch (error) { setNotice(localizedError(error, t)) }
    finally { setBusy(null) }
  }

  return <section className="dpw-card" aria-labelledby="dpw-environment-title">
    <div className="dpw-heading">
      <div className="dpw-title" id="dpw-environment-title">{t('environment.title')}</div>
      <div className="dpw-description">{t('environment.description')}</div>
    </div>

    <div className="dpw-fields">
      <label className="dpw-field dpw-field-wide">
        <span className="dpw-label">{t('environment.mode.label')}</span>
        <select
          className="dpw-input"
          value={draft.mode}
          onChange={event => setDraft(current => ({ ...current, mode: event.target.value as ShellEnvironmentSettings['mode'] }))}
          disabled={busy !== null}
        >
          <option value="inherit">{t('environment.mode.inherit')}</option>
          <option value="desktopOnly">{t('environment.mode.desktop-only')}</option>
        </select>
      </label>
      {draft.mode === 'inherit' && <label className="dpw-field dpw-field-wide">
        <span className="dpw-label">{t('environment.shell.label')}</span>
        <input
          className="dpw-input"
          value={draft.shellPath ?? ''}
          placeholder={t('environment.shell.placeholder')}
          onChange={event => setDraft(current => ({ ...current, shellPath: event.target.value || null }))}
          disabled={busy !== null}
          spellCheck={false}
        />
        <span className="dpw-hint">{t('environment.shell.hint')}</span>
      </label>}
    </div>

    {snapshot !== null && <div className="dpw-notice" role="status">
      {describeEnvironment(snapshot, t)}
      <br />
      {snapshot.tools.map(tool => `${tool.name}: ${t(tool.available ? 'environment.tool.available' : 'environment.tool.missing')}`).join(' · ')}
      <br />
      {t('environment.overrides')} {snapshot.overriddenNames.join(', ')}
    </div>}

    <div className="dpw-actions">
      <button className="dpw-button" type="button" onClick={() => void preview()} disabled={busy !== null}>
        {busy === 'preview' ? t('environment.previewing') : t('environment.preview')}
      </button>
      <button className="dpw-button dpw-button-primary" type="button" onClick={() => void save()} disabled={busy !== null}>
        {busy === 'save' ? t('environment.saving') : t('environment.save')}
      </button>
      {snapshot?.restartRequired === true && <button className="dpw-button" type="button" onClick={() => void restart()} disabled={busy !== null}>
        {busy === 'restart' ? t('environment.restarting') : t('environment.restart')}
      </button>}
    </div>

    {permissions.length > 0 && <>
    <div className="dpw-heading">
      <div className="dpw-title">{t('permissions.title')}</div>
      <div className="dpw-description">{t('permissions.description')}</div>
    </div>
    <div className="dpw-permission-list">
      {permissions.map(permission => <div className="dpw-permission-row" key={permission.id}>
        <div>
          <div className="dpw-label">{t(`permissions.${permission.id}.label`)}</div>
          <div className="dpw-hint">
            {t(`permissions.status.${permission.status}`)} · {t(`permissions.owner.${permission.owner}`)}
          </div>
        </div>
        <div className="dpw-actions">
          {permission.canRequest && permission.status !== 'granted' && <button
            className="dpw-button"
            type="button"
            disabled={busy !== null}
            onClick={() => void requestPermission(permission.id)}
          >{t('permissions.request')}</button>}
          {permission.canOpenSettings && <button
            className="dpw-button"
            type="button"
            disabled={busy !== null}
            onClick={() => void openSettings(permission.id)}
          >{t('permissions.open-settings')}</button>}
        </div>
      </div>)}
    </div>
    <div className="dpw-actions">
      <button className="dpw-button" type="button" disabled={busy !== null} onClick={() => void refreshPermissions()}>
        {busy === 'refresh-permissions' ? t('permissions.refreshing') : t('permissions.refresh')}
      </button>
    </div>
    </>}
    {notice !== '' && <div className="dpw-notice" role="status">{notice}</div>}
  </section>
}

function describeEnvironment(
  snapshot: ShellEnvironmentSnapshot,
  t: EnvironmentPermissionsRowProps['t'],
): string {
  if (snapshot.status.state === 'desktopOnly') return t('environment.status.desktop-only')
  if (snapshot.status.state === 'failed' || snapshot.status.state === 'timedOut') {
    return `${t('environment.status.failed')} ${snapshot.status.errorCode ?? ''}`.trim()
  }
  return t('environment.status.inherited')
    .replace('{count}', String(snapshot.status.variableCount))
    .replace('{shell}', snapshot.status.shellPath || t('environment.shell.default'))
}

function localizedError(
  error: unknown,
  t: EnvironmentPermissionsRowProps['t'],
): string {
  const detail = error instanceof Error ? error.message : String(error)
  return `${t('environment.error.generic')} ${detail}`
}
