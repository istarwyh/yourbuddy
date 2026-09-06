import { randomUUID } from 'node:crypto'

import { redactDiagnostic } from './evolution.js'
import { historicalRunLock } from './historical-run-lock.js'

const OPERATION_RETENTION_MS = 60 * 60 * 1000

function timestamp(now) {
  const value = now()
  return value instanceof Date ? value : new Date(value)
}

function publicError(error) {
  const raw = error instanceof Error ? error.message : String(error)
  const message = redactDiagnostic(raw).slice(0, 512)
  const match = message.match(/^([A-Z][A-Z0-9_]+):\s*(.*)$/s)
  return {
    code: match?.[1] ?? 'HISTORICAL_JOB_FAILED',
    message: match?.[2] || message || 'Historical evaluation failed',
  }
}

function publicOperation(value) {
  if (!value) return { status: 'idle' }
  return {
    schemaVersion: 1,
    operationId: value.operationId,
    workspace: value.workspace,
    status: value.status,
    selectedCount: value.selectedCount,
    createdAt: value.createdAt,
    ...(value.startedAt ? { startedAt: value.startedAt } : {}),
    ...(value.finishedAt ? { finishedAt: value.finishedAt } : {}),
    ...(value.jobName ? { jobName: value.jobName } : {}),
    ...(value.error ? { error: value.error } : {}),
  }
}

/** Same-origin Web orchestration for the narrow Historical Session diagnostic path. */
export class HistoricalWebController {
  constructor({
    service,
    sessionDiagnostic,
    now = () => new Date(),
    randomId = () => randomUUID(),
    schedule = callback => queueMicrotask(callback),
    operationRetentionMs = OPERATION_RETENTION_MS,
    runLock = historicalRunLock,
  }) {
    this.service = service
    this.sessionDiagnostic = sessionDiagnostic
    this.now = now
    this.randomId = randomId
    this.schedule = schedule
    this.operationRetentionMs = operationRetentionMs
    this.runLock = runLock
    this.previews = new Map()
    this.operations = new Map()
    this.consumedPreviews = new Map()
  }

  _cleanup() {
    const now = timestamp(this.now).getTime()
    for (const [previewId, preview] of this.previews) {
      if (Date.parse(preview.expiresAt) <= now) this.previews.delete(previewId)
    }
    for (const [operationId, operation] of this.operations) {
      if (operation.finishedAt && Date.parse(operation.finishedAt) + this.operationRetentionMs <= now) {
        this.operations.delete(operationId)
      }
    }
    for (const [previewId, operationId] of this.consumedPreviews) {
      if (!this.operations.has(operationId)) this.consumedPreviews.delete(previewId)
    }
  }

  _activeWorkspaceOperation(workspace) {
    return [...this.operations.values()]
      .filter(item => item.workspace === workspace && ['queued', 'running'].includes(item.status))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
  }

  _activeOwnedOperation(workspace, ownerSessionId) {
    return [...this.operations.values()]
      .filter(item => item.workspace === workspace && item.ownerSessionId === ownerSessionId && ['queued', 'running'].includes(item.status))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
  }

  async preview(args = {}) {
    this._cleanup()
    const ownerSessionId = String(args.sessionId ?? '').trim()
    if (!ownerSessionId) throw new Error('HISTORICAL_SESSION_REQUIRED: a live DSH Session is required')
    const resolved = await this.service.historicalWorkspace({ workspace: args.workspace, sessionId: ownerSessionId })
    const previewId = this.randomId()
    const identity = {
      projectRoot: resolved.projectRoot,
      ownerSessionId: `web-historical:${ownerSessionId}:${this.randomId()}`,
    }
    const preview = await this.sessionDiagnostic.previewWithIdentity({
      limit: args.limit === undefined ? 10 : args.limit,
      createdAfter: args.createdAfter,
      includeFeedback: args.includeFeedback !== false,
    }, identity, { config: resolved.config })
    const { selectionToken, ...visible } = preview
    this.previews.set(previewId, {
      previewId,
      workspace: resolved.workspace,
      ownerSessionId,
      identity,
      config: resolved.config,
      selectionToken,
      selectedCount: preview.selected.length,
      expiresAt: preview.expiresAt,
    })
    return {
      ...visible,
      schemaVersion: 1,
      previewId,
      workspace: resolved.workspace,
    }
  }

  async run(args = {}) {
    this._cleanup()
    const ownerSessionId = String(args.sessionId ?? '').trim()
    if (!ownerSessionId) throw new Error('HISTORICAL_SESSION_REQUIRED: a live DSH Session is required')
    const previewId = String(args.previewId ?? '')
    if (!previewId) throw new Error('HISTORICAL_PREVIEW_REQUIRED: preview the recent Sessions before confirming the Job')
    const existingOperationId = this.consumedPreviews.get(previewId)
    if (existingOperationId) {
      const existing = this.operations.get(existingOperationId)
      if (existing?.ownerSessionId !== ownerSessionId) throw new Error('HISTORICAL_PREVIEW_SESSION_MISMATCH: the preview belongs to another DSH Session')
      if (args.workspace && existing?.workspace !== args.workspace) {
        throw new Error('HISTORICAL_PREVIEW_WORKSPACE_MISMATCH: the workspace changed; preview again')
      }
      return publicOperation(existing)
    }
    const preview = this.previews.get(previewId)
    if (!preview) throw new Error('HISTORICAL_PREVIEW_INVALID: this preview expired or was already discarded; preview again')
    if (preview.ownerSessionId !== ownerSessionId) throw new Error('HISTORICAL_PREVIEW_SESSION_MISMATCH: the preview belongs to another DSH Session')
    if (args.workspace && preview.workspace !== args.workspace) {
      throw new Error('HISTORICAL_PREVIEW_WORKSPACE_MISMATCH: the workspace changed; preview again')
    }
    const active = this._activeWorkspaceOperation(preview.workspace)
    if (active) {
      throw new Error('HISTORICAL_JOB_ALREADY_RUNNING: wait for the current Historical Session Job to finish')
    }
    const lease = this.runLock.acquire(preview.config, {
      channel: 'web',
      workspace: preview.workspace,
    })
    const operationId = this.randomId()
    const createdAt = timestamp(this.now).toISOString()
    const operation = {
      operationId,
      workspace: preview.workspace,
      ownerSessionId,
      status: 'queued',
      selectedCount: preview.selectedCount,
      createdAt,
    }
    try {
      this.previews.delete(previewId)
      this.operations.set(operationId, operation)
      this.consumedPreviews.set(previewId, operationId)
      this.schedule(() => { void this._execute(operation, preview, lease) })
    } catch (error) {
      this.operations.delete(operationId)
      this.consumedPreviews.delete(previewId)
      this.previews.set(previewId, preview)
      lease.release()
      throw error
    }
    return publicOperation(operation)
  }

  async _execute(operation, preview, lease) {
    try {
      operation.status = 'running'
      operation.startedAt = timestamp(this.now).toISOString()
      const result = await this.sessionDiagnostic.runWithIdentity({
        selectionToken: preview.selectionToken,
      }, preview.identity, { config: preview.config })
      operation.status = 'completed'
      operation.jobName = String(result.job ?? '').split(/[\\/]/).filter(Boolean).at(-1)
      if (!operation.jobName) throw new Error('HISTORICAL_JOB_INCOMPLETE: the completed run returned no Job identity')
    } catch (error) {
      operation.status = 'failed'
      operation.error = publicError(error)
    } finally {
      try {
        operation.finishedAt = timestamp(this.now).toISOString()
      } finally {
        lease.release()
      }
    }
  }

  operation(args = {}) {
    this._cleanup()
    const ownerSessionId = String(args.sessionId ?? '').trim()
    if (!ownerSessionId) throw new Error('HISTORICAL_SESSION_REQUIRED: a live DSH Session is required')
    const operationId = String(args.operationId ?? '')
    if (operationId) {
      const operation = this.operations.get(operationId)
      if (!operation) return { status: 'idle' }
      if (operation.ownerSessionId !== ownerSessionId) throw new Error('HISTORICAL_OPERATION_SESSION_MISMATCH: the operation belongs to another DSH Session')
      if (args.workspace && operation.workspace !== args.workspace) {
        throw new Error('HISTORICAL_OPERATION_WORKSPACE_MISMATCH: the operation belongs to another workspace')
      }
      return publicOperation(operation)
    }
    if (!args.workspace) return { status: 'idle' }
    return publicOperation(this._activeOwnedOperation(String(args.workspace), ownerSessionId))
  }
}
