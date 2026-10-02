/** Four-surface diagnostics for a YourBuddy Capability Pack. */

import { useEffect, useMemo, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PluginDetailProps } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { requestManagedCliPath } from './desktop-lifecycle.ts'

interface CommandState {
  readonly name: string
  readonly status: 'exposed' | 'conflict' | 'missing' | 'unsupported'
  readonly detail?: string
}

interface PackState {
  readonly packageName: string
  readonly version: string
  readonly commands: readonly CommandState[]
  readonly skills: readonly { readonly path: string; readonly status: 'registered' | 'missing' }[]
  readonly ui: 'loaded' | 'headless'
}

type CapabilityPackSectionProps = PropsRuntime<'plugins.detail.section'>
  & PropsLocale<'settings.personal-workbench'>
  & PluginDetailProps

function stateText(state: PackState): string {
  return JSON.stringify({
    package: `${state.packageName}@${state.version}`,
    cli: state.commands,
    skill: state.skills,
    ui: state.ui,
  }, null, 2)
}

/** Render Package, CLI, Skill, and UI state for a declared pack. */
export function CapabilityPackSection({ subject, t }: CapabilityPackSectionProps) {
  const [packs, setPacks] = useState<readonly PackState[]>([])
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (subject.kind !== 'bundle') return
    let active = true
    void fetch('/api/yourbuddy/capability-packs', { credentials: 'same-origin', cache: 'no-store' })
      .then(response => response.json())
      .then((body: { ok?: boolean; value?: readonly PackState[] }) => {
        if (active && body.ok === true && Array.isArray(body.value)) setPacks(body.value)
      })
      .catch(() => { if (active) setPacks([]) })
    return () => { active = false }
  }, [subject])
  const pack = useMemo(() => subject.kind === 'bundle'
    ? packs.find(item => item.packageName === subject.pkg.name)
    : undefined, [packs, subject])
  if (pack === undefined) return null
  const cliState = pack.commands.every(command => command.status === 'exposed') ? 'exposed'
    : pack.commands.some(command => command.status === 'conflict') ? 'conflict' : 'unhealthy'
  const skillState = pack.skills.every(skill => skill.status === 'registered') ? 'registered' : 'missing'
  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(stateText(pack))
    setMessage(t('capability.copied'))
  }
  const enable = async (): Promise<void> => {
    try {
      await requestManagedCliPath()
      setMessage(t('lifecycle.cli.enabled'))
    }
    catch (error) {
      setMessage(`${t('lifecycle.cli.error')} ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return (
    <section className="dpw-capability" data-capability-pack={pack.packageName}>
      <div className="dpw-heading">
        <div className="dpw-title">{t('capability.title')}</div>
        <div className="dpw-description">{t('capability.description')}</div>
      </div>
      <dl className="dpw-capability-grid">
        <dt>Package</dt><dd>installed · {pack.version}</dd>
        <dt>CLI</dt><dd>{cliState} · {pack.commands.map(command => command.name).join(', ')}</dd>
        <dt>Skill</dt><dd>{skillState} · {pack.skills.length}</dd>
        <dt>UI</dt><dd>{pack.ui}</dd>
      </dl>
      {pack.commands.flatMap(command => command.detail === undefined ? [] : [
        <code className="dpw-code" key={command.name}>{command.name}: {command.detail}</code>,
      ])}
      <div className="dpw-actions">
        <button type="button" className="dpw-button" onClick={() => { void enable() }}>{t('lifecycle.cli.action')}</button>
        <button type="button" className="dpw-button" onClick={() => { void copy() }}>{t('capability.copy')}</button>
      </div>
      {message === '' ? null : <div className="dpw-status" role="status">{message}</div>}
    </section>
  )
}
