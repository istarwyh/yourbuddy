import { createHash, randomBytes } from 'node:crypto'
import path from 'node:path'

import { containsCredentialText, containsLocalPath, containsOpaqueSecretText } from './credential-redaction.js'
import { foldSessionDiagnosticIndex } from './session-projection.js'

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])]),
    )
  }
  return value
}

export function canonicalDigest(value, namespace) {
  const body = JSON.stringify(canonicalize(value))
  return `sha256:${createHash('sha256').update(namespace).update('\0').update(body).digest('hex')}`
}

function sessionHeaderIdentity(header, effectiveAgentPreset) {
  return {
    version: header?.version,
    id: header?.id,
    createdAt: header?.createdAt,
    cwd: header?.cwd,
    parentSession: header?.parentSession,
    seedLength: header?.seedLength,
    origin: header?.origin,
    delegationDepth: header?.delegationDepth,
    ...(effectiveAgentPreset === undefined ? {} : { agentPreset: effectiveAgentPreset }),
  }
}

function sameProjectRoot(value, projectRoot) {
  if (!validSourceRoot(value) || !validSourceRoot(projectRoot)) return false
  return path.resolve(value) === path.resolve(projectRoot)
}

function validSourceRoot(value) {
  return typeof value === 'string' && !value.includes('\0') && path.isAbsolute(value)
}

function validTimestamp(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 8_640_000_000_000_000
}

function validSourceHeader(header) {
  return typeof header?.id === 'string' && header.id.trim().length > 0
    && validSourceRoot(header.cwd) && validTimestamp(header.createdAt)
}

function isoTime(value) {
  return validTimestamp(value) && value > 0 ? new Date(value).toISOString() : null
}

function safeIdentity(value, rawSessionId) {
  const text = typeof value === 'string' ? value : ''
  if (rawSessionId && text.includes(rawSessionId)) return '[redacted-identity]'
  if (
    containsCredentialText(text)
    || containsOpaqueSecretText(text)
    || containsLocalPath(text)
    || /(?:api[_-]?key|token|secret|password|authorization)/i.test(text)
  ) return '[redacted-identity]'
  return text.slice(0, 160)
}

async function mapConcurrent(values, concurrency, mapper) {
  const result = new Array(values.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor
      cursor += 1
      try {
        result[index] = { status: 'fulfilled', value: await mapper(values[index], index) }
      } catch (reason) {
        result[index] = { status: 'rejected', reason }
      }
    }
  })
  await Promise.all(workers)
  return result
}

function publicSelection(item, index) {
  const agentPreset = item.index.effectiveAgentPreset ?? item.header.agentPreset
  return {
    trialId: item.trialId,
    title: `历史会话 ${index + 1}`,
    createdAt: isoTime(item.header.createdAt),
    lastActivityAt: isoTime(item.index.lastActivityAt),
    turnCount: item.index.turnCount,
    humanMessageCount: item.index.humanMessageCount,
    assistantMessageCount: item.index.assistantMessageCount,
    toolCallCount: item.index.toolCallCount,
    lastTurnReason: item.index.lastTurnReason,
    agentPreset: agentPreset ? safeIdentity(agentPreset, item.rawSessionId) : null,
    modelRoutes: item.index.modelRoutes.map(route => ({
      provider: safeIdentity(route.provider, item.rawSessionId),
      model: safeIdentity(route.model, item.rawSessionId),
      ...(route.reasoning_effort ? { reasoning_effort: safeIdentity(route.reasoning_effort, item.rawSessionId) } : {}),
    })),
  }
}

export async function selectRecentSessions({
  sessionQuery,
  projectRoot,
  currentSessionId,
  scope = 'exact-cwd',
  limit = 10,
  maxSessionReads = 100,
  concurrency = 4,
  createdAfter,
  signal,
}) {
  if (!sessionQuery || typeof sessionQuery.readSession !== 'function') {
    throw new Error('DSH_SESSION_QUERY_UNAVAILABLE: this DSH Profile does not expose the Session Query service')
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    throw new Error('SESSION_LIMIT_INVALID: limit must be an integer from 1 to 10')
  }
  if (scope !== 'exact-cwd' && scope !== 'dsh-history') {
    throw new Error('SESSION_SELECTION_SCOPE_INVALID: scope must be exact-cwd or dsh-history')
  }
  if (!Number.isSafeInteger(maxSessionReads) || maxSessionReads < 1) {
    throw new Error('SESSION_READ_BUDGET_INVALID: maxSessionReads must be a positive integer')
  }
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error('SESSION_READ_CONCURRENCY_INVALID: concurrency must be a positive integer')
  }
  if (createdAfter !== undefined && !validTimestamp(createdAfter)) {
    throw new Error('SESSION_CREATED_AFTER_INVALID: createdAfter must be a valid timestamp')
  }
  signal?.throwIfAborted()
  const listed = typeof sessionQuery.filterSessions === 'function'
    ? await sessionQuery.filterSessions([
        ...(scope === 'exact-cwd' ? [{ kind: 'cwd', values: [projectRoot] }] : []),
        ...(createdAfter === undefined ? [] : [{ kind: 'created-at', from: createdAfter }]),
      ], signal)
    : await sessionQuery.listSessions(signal)
  signal?.throwIfAborted()
  if (!Array.isArray(listed)) {
    throw new Error('DSH_SESSION_QUERY_INVALID: Session Query returned an invalid Session list')
  }
  const excludedCounts = {
    outsideWorkspace: 0,
    beforeCreatedAfter: 0,
    currentSession: 0,
    subagent: 0,
    forkOrChild: 0,
    openTurn: 0,
    noDirectHumanInput: 0,
    noAssistantOutput: 0,
    userAborted: 0,
    harborInternal: 0,
    empty: 0,
    unreadable: 0,
    invalidHeader: 0,
    duplicate: 0,
  }
  const candidates = []
  const seenSessionIds = new Set()
  for (const record of listed) {
    const header = record?.header ?? {}
    if (!validSourceHeader(header)) {
      excludedCounts.invalidHeader += 1
      continue
    }
    if (seenSessionIds.has(header.id)) {
      excludedCounts.duplicate += 1
      continue
    }
    seenSessionIds.add(header.id)
    if (scope === 'exact-cwd' && !sameProjectRoot(header.cwd, projectRoot)) {
      excludedCounts.outsideWorkspace += 1
    } else if (header.id === currentSessionId) {
      excludedCounts.currentSession += 1
    } else if (createdAfter !== undefined && Number(header.createdAt) < createdAfter) {
      excludedCounts.beforeCreatedAfter += 1
    } else if (header.origin === 'subagent') {
      excludedCounts.subagent += 1
    } else if (
      header.parentSession !== undefined
      || Number(header.seedLength ?? 0) > 0
      || Number(header.delegationDepth ?? 0) > 0
    ) {
      excludedCounts.forkOrChild += 1
    } else {
      candidates.push(record)
    }
  }
  if (scope === 'exact-cwd' && candidates.length > maxSessionReads) {
    throw new Error(
      `SESSION_SELECTION_TOO_EXPENSIVE: ${candidates.length} exact Session reads exceed maxSessionReads=${maxSessionReads}; preview again with createdAfter to narrow the scan`,
    )
  }

  // SessionRecord exposes creation time, not last activity. Bound quick-start
  // reads by the newest-created candidate window, then rank the exact snapshots
  // by activity. Explicit scan metadata prevents claiming a global activity rank.
  if (scope === 'dsh-history') {
    candidates.sort((left, right) => (
      right.header.createdAt - left.header.createdAt
      || left.header.id.localeCompare(right.header.id)
    ))
  }
  const inspectRecord = async record => {
    signal?.throwIfAborted()
    const snapshot = await sessionQuery.readSession(record.header.id)
    signal?.throwIfAborted()
    if (!validSourceHeader(snapshot?.session) || !Array.isArray(snapshot?.events)) {
      throw new Error('Session Query returned an invalid Session snapshot')
    }
    if (JSON.stringify(canonicalize(sessionHeaderIdentity(snapshot.session)))
      !== JSON.stringify(canonicalize(sessionHeaderIdentity(record.header)))) {
      throw new Error('Session Query returned a mismatched Session header')
    }
    if (scope === 'exact-cwd' && !sameProjectRoot(snapshot.session.cwd, projectRoot)) {
      throw new Error('Session Query changed the Session workspace boundary')
    }
    const index = foldSessionDiagnosticIndex(snapshot.events, snapshot.session)
    if (index.lastSeq === null) return { excluded: 'empty' }
    if (index.openTurn) return { excluded: 'openTurn' }
    if (index.lastTurnReason === 'aborted') return { excluded: 'userAborted' }
    if (index.humanMessageCount < 1) return { excluded: 'noDirectHumanInput' }
    if (index.assistantMessageCount < 1) return { excluded: 'noAssistantOutput' }
    if (index.hasHarborToolCall || /harbor/i.test(String(index.effectiveAgentPreset ?? ''))) {
      return { excluded: 'harborInternal' }
    }
    const header = sessionHeaderIdentity(snapshot.session, index.effectiveAgentPreset)
    const sourceDigest = canonicalDigest(
      { session: header, events: snapshot.events },
      'harbor-dsh-session-source-v1',
    )
    const sourceRef = canonicalDigest(
      { id: snapshot.session.id, header },
      'harbor-dsh-session-source-ref-v1',
    )
    return { selected: {
      rawSessionId: snapshot.session.id,
      header,
      events: snapshot.events,
      index,
      sourceDigest,
      sourceRef,
      capturedThroughSeq: index.lastSeq,
      trialId: `session-${sourceRef.slice('sha256:'.length, 'sha256:'.length + 12)}`,
    } }
  }
  const eligible = []
  const readBudget = Math.min(candidates.length, maxSessionReads)
  let readCount = 0
  // Quick experience needs a few useful examples, not every transcript. Stop
  // after a small concurrent batch supplies enough, without losing the cap.
  while (readCount < readBudget) {
    const batch = candidates.slice(readCount, Math.min(readCount + concurrency, readBudget))
    const snapshots = await mapConcurrent(batch, concurrency, inspectRecord)
    readCount += batch.length
    signal?.throwIfAborted()
    for (const outcome of snapshots) {
      if (outcome.status === 'rejected') excludedCounts.unreadable += 1
      else if (outcome.value.excluded) excludedCounts[outcome.value.excluded] += 1
      else eligible.push(outcome.value.selected)
    }
    if (scope === 'dsh-history' && eligible.length >= limit) break
  }
  const scan = {
    scope,
    listedCount: listed.length,
    candidateCount: candidates.length,
    readCount,
    unscannedCount: candidates.length - readCount,
    partial: candidates.length > readCount,
    windowOrder: scope === 'dsh-history' ? 'created-at-desc' : 'all-candidates',
    selectionOrder: 'last-activity-desc',
  }
  eligible.sort((left, right) => (
    right.index.lastActivityAt - left.index.lastActivityAt
    || left.sourceRef.localeCompare(right.sourceRef)
  ))
  const selected = eligible.slice(0, limit)
  const warnings = []
  if (excludedCounts.unreadable) {
    warnings.push(`${excludedCounts.unreadable} Session(s) could not be read and were excluded.`)
  }
  if (excludedCounts.invalidHeader) {
    warnings.push(`${excludedCounts.invalidHeader} Session record(s) had invalid metadata and were excluded.`)
  }
  if (scan.partial) {
    warnings.push(`Only the ${scan.readCount} most recently created eligible Session candidates were checked; ${scan.unscannedCount} older candidate(s) were not read. Results are ranked by activity within this window, not across all DSH history.`)
  }
  return {
    selected,
    publicSelected: selected.map(publicSelection),
    excludedCounts,
    scan,
    warnings,
  }
}

export function verifySessionSnapshot(expected, snapshot, projectRoot) {
  if (!validSourceHeader(snapshot?.session) || !Array.isArray(snapshot?.events)
    || snapshot.session.id !== expected.rawSessionId || !sameProjectRoot(snapshot.session.cwd, projectRoot)) {
    return false
  }
  const index = foldSessionDiagnosticIndex(snapshot.events, snapshot.session)
  if (index.lastSeq !== expected.capturedThroughSeq || index.openTurn) return false
  const digest = canonicalDigest(
    { session: sessionHeaderIdentity(snapshot.session, index.effectiveAgentPreset), events: snapshot.events },
    'harbor-dsh-session-source-v1',
  )
  return digest === expected.sourceDigest
}

export class SessionSelectionTokenStore {
  constructor({ ttlMs = 15 * 60 * 1000, now = () => Date.now(), randomToken } = {}) {
    this.ttlMs = ttlMs
    this.now = now
    this.randomToken = randomToken ?? (() => randomBytes(32).toString('base64url'))
    this.tokens = new Map()
  }

  issue(value) {
    this.purge()
    const token = this.randomToken()
    const expiresAt = this.now() + this.ttlMs
    this.tokens.set(token, { ...value, expiresAt })
    return { token, expiresAt }
  }

  consume(token, { ownerSessionId, projectRoot }) {
    const stored = this.tokens.get(token)
    if (!stored) throw new Error('SESSION_SELECTION_TOKEN_INVALID: preview again before running the diagnostic')
    // Consume before validation so a stolen or failed token cannot be replayed.
    this.tokens.delete(token)
    if (stored.ownerSessionId !== ownerSessionId) {
      throw new Error('SESSION_SELECTION_TOKEN_OWNER_MISMATCH: the token belongs to another Agent Session')
    }
    if (path.resolve(stored.projectRoot) !== path.resolve(projectRoot)) {
      throw new Error('SESSION_SELECTION_TOKEN_WORKSPACE_MISMATCH: the token belongs to another workspace')
    }
    if (stored.expiresAt <= this.now()) {
      throw new Error('SESSION_SELECTION_TOKEN_EXPIRED: preview again before running the diagnostic')
    }
    this.purge()
    return stored
  }

  purge() {
    const now = this.now()
    for (const [token, value] of this.tokens) {
      if (value.expiresAt <= now) this.tokens.delete(token)
    }
  }
}
