import { redactCredentialText, redactLocalPaths, redactOpaqueSecretText } from './credential-redaction.js'

export const DASHBOARD_ROUTE = '/_dsh/harbor-evolution/dashboard'
export const JOB_ROUTE = '/_dsh/harbor-evolution/job'
export const TRIALS_ROUTE = '/_dsh/harbor-evolution/trials'
export const TRIAL_ROUTE = '/_dsh/harbor-evolution/trial'
export const DATASET_ROUTE = '/_dsh/harbor-evolution/dataset'
export const PROGRESS_ROUTE = '/_dsh/harbor-evolution/progress'
export const COMPARE_ROUTE = '/_dsh/harbor-evolution/compare'
export const GOVERNANCE_ROUTE = '/_dsh/harbor-evolution/governance'
export const EVALUATOR_ROUTE = '/_dsh/harbor-evolution/evaluator'
export const META_ROUTE = '/_dsh/harbor-evolution/meta'
export const PROJECT_ROOT_ROUTE = '/_dsh/harbor-evolution/project-root'
export const VERSION_ROUTE = '/_dsh/harbor-evolution/version'
export const HISTORICAL_PREVIEW_ROUTE = '/_dsh/harbor-evolution/historical-preview'
export const HISTORICAL_RUN_ROUTE = '/_dsh/harbor-evolution/historical-run'
export const HISTORICAL_OPERATION_ROUTE = '/_dsh/harbor-evolution/historical-operation'
export const SESSION_CONTEXT_ROUTE = '/_dsh/harbor-evolution/session-context'
export const SESSION_CONTEXT_RESOLVE_ROUTE = '/_dsh/harbor-evolution/session-context-resolve'
const MAX_MUTATION_BYTES = 256 * 1024
const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]{2,127}$/

function sendJson(response, status, body) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  })
  response.end(JSON.stringify(body))
}

export function isSameOriginRequest(request) {
  const fetchSite = request.headers['sec-fetch-site']
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false
  const origin = request.headers.origin
  if (!origin) {
    if (fetchSite === 'same-origin') return true
    const address = request.socket?.remoteAddress ?? ''
    return address === '::1' || address === '127.0.0.1' || address.startsWith('127.') || address.startsWith('::ffff:127.')
  }
  const host = request.headers.host
  if (!host) return false
  try {
    const parsed = new URL(origin)
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.host === host
  } catch {
    return false
  }
}

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error)
  return redactLocalPaths(redactOpaqueSecretText(redactCredentialText(message, '[redacted]'), '[redacted]'))
}

function safeErrorPayload(error, fallbackCode) {
  const message = safeError(error)
  const directCode = error && typeof error === 'object' && typeof error.code === 'string' && SAFE_ERROR_CODE.test(error.code)
    ? error.code
    : undefined
  const embeddedCode = message.match(/^(?:[A-Za-z]+Error:\s*)?([A-Z][A-Z0-9_]{2,127})(?::|\b)/)?.[1]
  return { code: directCode ?? embeddedCode ?? fallbackCode, message }
}

export function createApiHandler(load, code = 'request-failed') {
  return (request, response) => {
    if (request.method !== 'GET') {
      response.writeHead(405, { allow: 'GET' })
      response.end()
      return
    }
    if (!isSameOriginRequest(request)) {
      sendJson(response, 403, { ok: false, error: { code: 'forbidden', message: 'same-origin request required' } })
      return
    }
    const url = new URL(request.url ?? '/', 'http://localhost')
    const args = Object.fromEntries(url.searchParams)
    Promise.resolve().then(() => load(args)).then(
      value => sendJson(response, 200, { ok: true, value }),
      error => sendJson(response, 500, { ok: false, error: safeErrorPayload(error, code) }),
    )
  }
}

export function createDashboardHandler(service) {
  return createApiHandler(args => service.dashboard(args), 'dashboard-unavailable')
}

export function createMutationHandler(update, code = 'update-failed') {
  return async (request, response) => {
    if (request.method !== 'POST') {
      response.writeHead(405, { allow: 'POST' })
      response.end()
      return
    }
    if (!isSameOriginRequest(request)) {
      sendJson(response, 403, { ok: false, error: { code: 'forbidden', message: 'same-origin request required' } })
      return
    }
    if (!String(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
      sendJson(response, 415, { ok: false, error: { code: 'unsupported-media-type', message: 'application/json required' } })
      return
    }
    try {
      const chunks = []
      let size = 0
      for await (const chunk of request) {
        size += chunk.length
        if (size > MAX_MUTATION_BYTES) {
          sendJson(response, 413, { ok: false, error: { code: 'payload-too-large', message: 'request body is too large' } })
          return
        }
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      const value = await update(body)
      sendJson(response, 200, { ok: true, value })
    } catch (error) {
      sendJson(response, 400, { ok: false, error: safeErrorPayload(error, code) })
    }
  }
}

export function installDashboardWeb(ctx, service, historicalController) {
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['webServer'], (webCtx) => {
    const routes = [
      [DASHBOARD_ROUTE, createDashboardHandler(service)],
      [JOB_ROUTE, createApiHandler(args => service.job(args), 'job-unavailable')],
      [TRIALS_ROUTE, createApiHandler(args => service.trials(args), 'trials-unavailable')],
      [TRIAL_ROUTE, createApiHandler(args => service.trial(args), 'trial-unavailable')],
      [DATASET_ROUTE, createApiHandler(args => service.dataset(args), 'dataset-unavailable')],
      [PROGRESS_ROUTE, createApiHandler(args => service.progress(args), 'progress-unavailable')],
      [COMPARE_ROUTE, createApiHandler(args => service.comparison(args), 'comparison-unavailable')],
      [GOVERNANCE_ROUTE, createApiHandler(args => service.governance(args), 'governance-unavailable')],
      [EVALUATOR_ROUTE, createMutationHandler(args => service.evaluator(args, { browser: true }), 'evaluator-update-failed')],
      [META_ROUTE, createApiHandler(args => service.meta(args), 'meta-evaluation-unavailable')],
      ...(historicalController ? [
        [HISTORICAL_PREVIEW_ROUTE, createMutationHandler(args => historicalController.preview(args), 'historical-preview-failed')],
        [HISTORICAL_RUN_ROUTE, createMutationHandler(args => historicalController.run(args), 'historical-run-failed')],
        [HISTORICAL_OPERATION_ROUTE, createApiHandler(args => historicalController.operation(args), 'historical-operation-unavailable')],
      ] : []),
      [SESSION_CONTEXT_ROUTE, createMutationHandler(args => service.bindUiContext(args), 'session-context-bind-failed')],
      ['/_dsh/harbor-evolution/trial-selection', createMutationHandler(args => service.createTrialSelection(args), 'trial-selection-failed')],
      ['/_dsh/harbor-evolution/selection-detail', createApiHandler(args => service.trialSelection(args), 'trial-selection-failed')],
      ['/_dsh/harbor-evolution/action-draft', createMutationHandler(args => service.proposeAction(args), 'action-draft-failed')],
      ['/_dsh/harbor-evolution/action-preview', createMutationHandler(args => service.previewAction(args), 'action-preview-failed')],
      ['/_dsh/harbor-evolution/action-confirm', createMutationHandler(args => service.confirmAction(args), 'action-confirm-failed')],
      ['/_dsh/harbor-evolution/action-operation', createApiHandler(args => service.actionOperation(args), 'action-operation-failed')],
      ['/_dsh/harbor-evolution/action-operations', createApiHandler(args => service.listActionOperations(args), 'action-operations-failed')],
      ['/_dsh/harbor-evolution/action-inspect', createApiHandler(args => service.inspectActionOperation(args), 'action-inspect-failed')],
      ['/_dsh/harbor-evolution/action-recover', createMutationHandler(args => service.recoverActionOperation(args), 'action-recover-failed')],
      ['/_dsh/harbor-evolution/action-cancel', createMutationHandler(args => service.cancelAction(args), 'action-cancel-failed')],
      [SESSION_CONTEXT_RESOLVE_ROUTE, createMutationHandler(args => service.resolveBrowserUiContext(args), 'session-context-resolve-failed')],
      [VERSION_ROUTE, createApiHandler(args => service.version(args), 'version-check-unavailable')],
      [PROJECT_ROOT_ROUTE, createMutationHandler(args => service.setProjectRoot(args), 'project-root-update-failed')],
    ]
    for (const [route, handler] of routes) {
      webCtx.effect(() => webCtx.webServer.register({ kind: 'exact', path: route, handler }), `harbor-evolution: ${route}`)
    }
  })
}
