/** Props-driven component preparation and device-local metrics in General settings. */

import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ComponentLocaleKey } from './component-locales.ts'
import type { CacheCleanupPreview, CacheCleanupResult, ComponentController, ComponentCounters, ComponentOverview, InstallPlan, MetricsSnapshot } from './component-model.ts'

/** The desktop owner supplies native operations and the locale dictionary. */
export interface ComponentSettingsSectionProps {
  readonly t: (key: ComponentLocaleKey) => string
  readonly controller: ComponentController
}

type Busy = 'load' | 'plan' | 'install' | 'cache-preview' | 'cache-clean' | null
type CacheReview = { readonly preview: CacheCleanupPreview | null; readonly error: string | null }
type PlanReview = { readonly key: string; readonly plan: InstallPlan | null; readonly error: string | null }
type Problem = { readonly key: ComponentLocaleKey; readonly detail: string }

/**
 * Render inventory and require review before component preparation.
 * @param props Localized copy and desktop-owned operations.
 * @returns The component settings section; installation starts only after plan confirmation.
 */
export function ComponentSettingsSection({ t, controller }: ComponentSettingsSectionProps) {
  const titleId = useId()
  const reviewId = useId()
  const cacheId = useId()
  const cacheDescriptionId = useId()
  const [overview, setOverview] = useState<ComponentOverview | null>(null)
  const [busy, setBusy] = useState<Busy>('load')
  const [review, setReview] = useState<PlanReview | null>(null)
  const [cacheReview, setCacheReview] = useState<CacheReview | null>(null)
  const [cacheResult, setCacheResult] = useState<CacheCleanupResult | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [notice, setNotice] = useState<ComponentLocaleKey | null>(null)
  const operation = useRef({ active: false, sequence: 0, busy: null as Busy })
  const reviewPanel = useRef<HTMLDivElement>(null)
  const reviewTrigger = useRef<HTMLButtonElement | null>(null)
  const restoreFocus = useRef(false)
  const refreshButton = useRef<HTMLButtonElement>(null)
  const focusAfterInstall = useRef(false)
  const cachePanel = useRef<HTMLDivElement>(null)
  const cacheTrigger = useRef<HTMLButtonElement>(null)
  const cacheAgain = useRef<HTMLButtonElement>(null)
  const restoreCacheFocus = useRef(false)
  const focusAfterCleanup = useRef(false)
  const canPreviewCache = controller.previewCacheCleanup !== undefined && controller.cleanCache !== undefined

  const current = (sequence: number): boolean => operation.current.active && operation.current.sequence === sequence
  const finish = (sequence: number): void => {
    if (!current(sequence)) return
    if (operation.current.busy === 'install') focusAfterInstall.current = true
    if (operation.current.busy === 'cache-clean') focusAfterCleanup.current = true
    operation.current.busy = null
    setBusy(null)
  }

  const load = useCallback(async (): Promise<void> => {
    const owner = operation.current
    if (!owner.active || owner.busy !== null) return
    const sequence = ++owner.sequence
    owner.busy = 'load'
    setBusy('load')
    setReview(null)
    setCacheReview(null)
    setProblem(null)
    try {
      const value = await controller.load()
      if (owner.active && owner.sequence === sequence) setOverview(value)
    }
    catch (error) {
      if (owner.active && owner.sequence === sequence) {
        setOverview(null)
        setProblem({ key: 'components.load-error', detail: errorMessage(error) })
      }
    }
    finally {
      if (owner.active && owner.sequence === sequence) {
        owner.busy = null
        setBusy(null)
      }
    }
  }, [controller])

  useEffect(() => {
    operation.current.active = true
    operation.current.busy = null
    focusAfterInstall.current = false
    setOverview(null)
    setNotice(null)
    setCacheReview(null)
    setCacheResult(null)
    focusAfterCleanup.current = false
    void load()
    return () => {
      operation.current.active = false
      operation.current.sequence++
      operation.current.busy = null
    }
  }, [load])

  useEffect(() => {
    if (busy !== null || !focusAfterInstall.current) return
    focusAfterInstall.current = false
    refreshButton.current?.focus()
  }, [busy])

  useEffect(() => {
    if (busy !== null || !focusAfterCleanup.current) return
    focusAfterCleanup.current = false
    cacheAgain.current?.focus()
  }, [busy])

  const closeCacheReview = useCallback((): void => {
    if (operation.current.busy === 'cache-clean') return
    operation.current.sequence++
    operation.current.busy = null
    setCacheReview(null)
    setCacheResult(null)
    setBusy(null)
    restoreCacheFocus.current = true
  }, [])
  const cacheOpen = cacheReview !== null
  useEffect(() => {
    if (cacheOpen) cachePanel.current?.focus()
    else if (restoreCacheFocus.current) {
      restoreCacheFocus.current = false
      cacheTrigger.current?.focus()
    }
  }, [cacheOpen])
  useEffect(() => {
    if (!cacheOpen) return
    window.addEventListener('popstate', closeCacheReview)
    return () => { window.removeEventListener('popstate', closeCacheReview) }
  }, [cacheOpen, closeCacheReview])

  const closeReview = useCallback((): void => {
    if (operation.current.busy === 'install') return
    operation.current.sequence++
    operation.current.busy = null
    setReview(null)
    setBusy(null)
    restoreFocus.current = true
  }, [])

  useEffect(() => {
    if (review === null) return
    window.addEventListener('popstate', closeReview)
    return () => { window.removeEventListener('popstate', closeReview) }
  }, [review, closeReview])

  const reviewKey = review?.key
  useEffect(() => {
    if (reviewKey !== undefined) reviewPanel.current?.focus()
    else if (restoreFocus.current) {
      restoreFocus.current = false
      reviewTrigger.current?.focus()
    }
  }, [reviewKey])

  const plan = async (key: string): Promise<void> => {
    if (!operation.current.active || operation.current.busy !== null) return
    const sequence = ++operation.current.sequence
    operation.current.busy = 'plan'
    setBusy('plan')
    setProblem(null)
    setReview({ key, plan: null, error: null })
    try {
      const value = await controller.plan(key)
      if (current(sequence)) setReview({ key, plan: value, error: null })
    }
    catch (error) {
      if (current(sequence)) setReview({ key, plan: null, error: errorMessage(error) })
    }
    finally { finish(sequence) }
  }

  const install = async (): Promise<void> => {
    if (!operation.current.active || operation.current.busy !== null || review?.plan === null || review === null) return
    const key = review.key
    const sequence = ++operation.current.sequence
    operation.current.busy = 'install'
    setBusy('install')
    setProblem(null)
    setNotice(value => value === 'components.restart' ? value : null)
    let installed = false
    try {
      const result = await controller.install(key)
      if (!current(sequence)) return
      installed = true
      setNotice(value => result.restartRequired || value === 'components.restart' ? 'components.restart' : null)
      setReview(null)
      const value = await controller.load()
      if (!current(sequence)) return
      setOverview(value)
      setNotice(value => result.restartRequired || value === 'components.restart' ? 'components.restart' : 'components.installed-notice')
    }
    catch (error) {
      if (!current(sequence)) return
      setReview(null)
      if (installed) setOverview(null)
      setProblem({ key: installed ? 'components.refresh-after-error' : 'components.install-error', detail: errorMessage(error) })
    }
    finally { finish(sequence) }
  }

  const previewCache = async (): Promise<void> => {
    if (!operation.current.active || operation.current.busy !== null || review !== null
      || controller.previewCacheCleanup === undefined || controller.cleanCache === undefined) return
    const sequence = ++operation.current.sequence
    operation.current.busy = 'cache-preview'
    setBusy('cache-preview')
    setCacheReview({ preview: null, error: null })
    setCacheResult(null)
    try {
      const preview = await controller.previewCacheCleanup()
      if (current(sequence)) setCacheReview({ preview, error: null })
    }
    catch (error) {
      if (current(sequence)) setCacheReview({ preview: null, error: errorMessage(error) })
    }
    finally { finish(sequence) }
  }

  const cleanCache = async (): Promise<void> => {
    if (!operation.current.active || operation.current.busy !== null || controller.cleanCache === undefined
      || cacheReview?.preview === null || cacheReview === null || cacheReview.preview.files.length === 0) return
    const token = cacheReview.preview.token
    const sequence = ++operation.current.sequence
    operation.current.busy = 'cache-clean'
    setBusy('cache-clean')
    try {
      const result = await controller.cleanCache(token)
      if (!current(sequence)) return
      setCacheResult(result)
      setCacheReview({ preview: null, error: null })
    }
    catch (error) {
      // A failed or expired token is consumed locally; retry requires another explicit preview.
      if (current(sequence)) setCacheReview({ preview: null, error: errorMessage(error) })
    }
    finally { finish(sequence) }
  }

  const cacheError = (error: string): string => {
    const codes = { CACHE_CLEANUP_UNSUPPORTED: 'unsupported', CACHE_CLEANUP_BUSY: 'busy', CACHE_CLEANUP_STALE: 'stale', CACHE_CLEANUP_UNSAFE: 'unsafe' } as const
    for (const [code, key] of Object.entries(codes)) {
      if (error.startsWith(code)) return t(`components.cache.${key}`)
    }
    return error
  }

  const bytes = (value: number | null): string => value === null
    ? t('components.unmeasured')
    : t('components.bytes').replace('{bytes}', value.toLocaleString(t('components.locale')))

  return (
    <section className="dpw-card" aria-labelledby={titleId}>
      <div className="dpw-heading">
        <h3 id={titleId} className="dpw-title">{t('components.title')}</h3>
        <div className="dpw-description">{t('components.description')}</div>
        {overview !== null && <div className="dpw-hint">{t('components.version').replace('{version}', overview.appVersion)}</div>}
      </div>
      <div className="dpw-actions">
        <button ref={refreshButton} type="button" className="dpw-button" disabled={busy !== null || review !== null || cacheReview !== null} onClick={() => { void load() }}>
          {overview === null && problem !== null ? t('components.retry') : t('components.refresh')}
        </button>
      </div>
      {busy === 'load' && <div className="dpw-status" role="status">{t('components.loading')}</div>}
      {busy === 'install' && <div className="dpw-status" role="status">{t('components.installing')}</div>}
      {notice !== null && <div className="dpw-status" role="status">{t(notice)}</div>}
      {problem !== null && <div className="dpw-error" role="alert">{t(problem.key)} {problem.detail}</div>}
      {overview !== null && (
        <>
          {overview.components.length === 0 && <div className="dpw-status">{t('components.empty')}</div>}
          {overview.components.map(component => (
            <section className="dpw-capability" aria-label={component.key} key={component.key}>
              <h4 className="dpw-title">{component.key}</h4>
              <dl className="dpw-capability-grid">
                <dt>{t('components.kind')}</dt><dd>{t(`components.kind.${component.kind}`)}</dd>
                <dt>{t('components.component-version')}</dt><dd>{component.version}</dd>
                <dt>{t('components.purpose')}</dt><dd>{component.purpose}</dd>
                <dt>{t('components.archive')}</dt><dd>{bytes(component.archiveBytes)}</dd>
                <dt>{t('components.installed')}</dt><dd>{bytes(component.installedBytes)}</dd>
                <dt>{t('components.state')}</dt><dd>{t(`components.state.${component.state}`)}</dd>
                <dt>{t('components.policy')}</dt><dd>{t(`components.policy.${component.policy}`)}</dd>
              </dl>
              {component.error !== null && <div className="dpw-error" role="alert">{component.error}</div>}
              {component.canInstall && (component.key === 'harborPlugin' || component.key === 'harbor') && (
                <div className="dpw-actions">
                  <button
                    type="button"
                    className="dpw-button"
                    disabled={busy !== null || review !== null || cacheReview !== null}
                    onClick={event => { reviewTrigger.current = event.currentTarget; void plan(component.key) }}
                  >{t('components.review')}</button>
                </div>
              )}
            </section>
          ))}
        </>
      )}
      {review !== null && (
        <div
          className="dpw-proxy-panel"
          role="region"
          aria-labelledby={reviewId}
          tabIndex={-1}
          ref={reviewPanel}
          onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeReview() } }}
        >
          <h4 id={reviewId} className="dpw-title">{t('components.plan-title').replace('{component}', review.key)}</h4>
          {busy === 'plan' && <div className="dpw-status" role="status">{t('components.planning')}</div>}
          {review.error !== null && <div className="dpw-error" role="alert">{t('components.plan-error')} {review.error}</div>}
          {review.plan !== null && (
            <>
              <div className="dpw-label">{t('components.dependencies')}</div>
              <ol className="dpw-hint">
                {review.plan.components.map(entry => (
                  <li key={entry.component}>
                    <span>{entry.component}</span> · <span>{entry.id}</span> · <span>{t(`components.${entry.action}`)}</span> · <span>{bytes(entry.archiveBytes)}</span>
                  </li>
                ))}
              </ol>
              <dl className="dpw-capability-grid"><dt>{t('components.plan-total')}</dt><dd>{bytes(review.plan.prepareArchiveBytes)}</dd></dl>
              <div className="dpw-hint">{t('components.plan-hint')}</div>
            </>
          )}
          <div className="dpw-actions">
            {review.plan !== null && <button type="button" className="dpw-button dpw-button-primary" disabled={busy !== null} onClick={() => { void install() }}>{t('components.confirm-install')}</button>}
            {review.error !== null && <button type="button" className="dpw-button" disabled={busy !== null} onClick={() => { void plan(review.key) }}>{t('components.retry')}</button>}
            <button type="button" className="dpw-button" disabled={busy === 'install'} onClick={closeReview}>{t('components.cancel')}</button>
          </div>
        </div>
      )}
      {canPreviewCache && (
        <section className="dpw-capability" aria-label={t('components.cache.title')}>
          <h4 className="dpw-title">{t('components.cache.title')}</h4>
          <div id={cacheDescriptionId} className="dpw-hint">{t('components.cache.description')}</div>
          <div className="dpw-actions">
            <button ref={cacheTrigger} type="button" className="dpw-button" disabled={busy !== null || review !== null || cacheReview !== null} onClick={() => { void previewCache() }}>{t('components.cache.preview')}</button>
          </div>
          {cacheReview !== null && (
            <div ref={cachePanel} className="dpw-proxy-panel" role="region" aria-labelledby={cacheId} aria-describedby={cacheDescriptionId} tabIndex={-1}
              onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeCacheReview() } }}>
              <h4 id={cacheId} className="dpw-title">{t('components.cache.review')}</h4>
              {busy === 'cache-preview' && <div role="status" className="dpw-status">{t('components.cache.previewing')}</div>}
              {busy === 'cache-clean' && <div role="status" className="dpw-status">{t('components.cache.cleaning')}</div>}
              {cacheReview.error !== null && <div role="alert" className="dpw-error">{cacheError(cacheReview.error)}</div>}
              {cacheReview.preview !== null && (
                <>
                  {cacheReview.preview.files.length === 0 && <div className="dpw-status">{t('components.cache.empty')}</div>}
                  <ul className="dpw-hint">{cacheReview.preview.files.map((file, index) => <li key={`${file.component}:${file.kind}:${index}`}>{file.component} · {t(`components.cache.kind.${file.kind}`)} · {bytes(file.bytes)}</li>)}</ul>
                  <dl className="dpw-capability-grid"><dt>{t('components.cache.total')}</dt><dd>{bytes(cacheReview.preview.totalBytes)}</dd></dl>
                </>
              )}
              {cacheResult !== null && (
                <>
                  <div role="status" className="dpw-status">{t(cacheResult.complete ? 'components.cache.complete' : 'components.cache.partial')}</div>
                  <div className="dpw-hint">{t('components.cache.deleted').replace('{files}', cacheResult.deletedFiles.toLocaleString(t('components.locale'))).replace('{bytes}', bytes(cacheResult.deletedBytes))}</div>
                  {cacheResult.failures.length > 0 && <ul className="dpw-error">{cacheResult.failures.map((failure, index) => <li key={`${failure.component}:${failure.kind}:${index}`}>{failure.component} · {t(`components.cache.kind.${failure.kind}`)} · {cacheError(failure.error)}</li>)}</ul>}
                </>
              )}
              <div className="dpw-actions">
                {cacheReview.preview !== null && <button type="button" className="dpw-button" disabled={busy !== null || cacheReview.preview.files.length === 0} onClick={() => { void cleanCache() }}>{t('components.cache.confirm')}</button>}
                {busy === null && cacheReview.preview === null && <button ref={cacheAgain} type="button" className="dpw-button" onClick={() => { void previewCache() }}>{t('components.cache.again')}</button>}
                <button type="button" className="dpw-button" disabled={busy === 'cache-clean'} onClick={closeCacheReview}>{t(cacheResult === null ? 'components.cache.cancel' : 'components.cache.close')}</button>
              </div>
            </div>
          )}
        </section>
      )}
      {overview !== null && <LocalMetrics t={t} metrics={overview.metrics} error={overview.metricsError} />}
    </section>
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function LocalMetrics({ t, metrics, error }: { readonly t: ComponentSettingsSectionProps['t']; readonly metrics: MetricsSnapshot | null; readonly error: string | null }) {
  const fields: readonly (keyof ComponentCounters)[] = ['networkBytes', 'retransferredBytes', 'cacheArchiveBytes', 'offlineSeedArchiveBytes', 'resumeAttempts', 'resumeSuccesses', 'installs']
  const pomodoroFields: readonly (keyof ComponentCounters)[] = ['invocations', 'successfulInvocations']
  const number = (value: number): string => value.toLocaleString(t('components.locale'))
  const duration = (value: number): string => t('components.metrics.ms').replace('{value}', number(value))
  return (
    <section className="dpw-capability" aria-label={t('components.metrics.title')}>
      <h4 className="dpw-title">{t('components.metrics.title')}</h4>
      {metrics === null && <div className="dpw-status">{t('components.metrics.unavailable')}</div>}
      {error !== null && <div className="dpw-error" role="alert">{error}</div>}
      {metrics !== null && (
        <>
          <div className="dpw-hint">{t('components.metrics.scope').replace('{version}', metrics.appVersion).replace('{started}', new Date(metrics.windowStartedAtUnixMs).toLocaleString(t('components.locale')))}</div>
          <dl className="dpw-capability-grid">
            <dt>{t('components.metrics.boots')}</dt><dd>{number(metrics.bootAttempts)}</dd>
            <dt>{t('components.metrics.ready')}</dt><dd>{number(metrics.workbenchReadyCount)}</dd>
            <dt>{t('components.metrics.ready-total')}</dt><dd>{duration(metrics.workbenchReadyTotalMs)}</dd>
            <dt>{t('components.metrics.ready-max')}</dt><dd>{duration(metrics.workbenchReadyMaxMs)}</dd>
            <dt>{t('components.metrics.failures')}</dt><dd>{number(metrics.readinessFailures)}</dd>
          </dl>
          <div className="dpw-hint">{t('components.metrics.hint')}</div>
          {Object.entries(metrics.components).map(([key, counters]) => (
            <details key={key} className="dpw-proxy-panel">
              <summary className="dpw-label">{key}</summary>
              <dl className="dpw-capability-grid">
                {[...fields, ...(key === 'harness' ? pomodoroFields : [])].map(field => <Fragment key={field}><dt>{t(`components.metrics.${field}`)}</dt><dd>{number(counters[field])}</dd></Fragment>)}
              </dl>
            </details>
          ))}
        </>
      )}
    </section>
  )
}
