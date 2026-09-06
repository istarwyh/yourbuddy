import { createHash, randomBytes } from 'node:crypto'
import path from 'node:path'

export const HARBOR_UI_CONTEXT_SCHEMA = 'harbor-ui-context/v1'
export const HARBOR_RESOLVED_CONTEXT_SCHEMA = 'harbor-resolved-context/v1'
export const MAX_UI_CONTEXT_BYTES = 4 * 1024
export const DEFAULT_UI_CONTEXT_TTL_MS = 15 * 60 * 1000
export const DEFAULT_UI_CONTEXT_MAX_ENTRIES = 2_048
export const DEFAULT_UI_CONTEXT_MAX_ENTRIES_PER_SESSION = 128

const ROUTES = new Set(['harbor.home', 'harbor.job', 'harbor.trial.detail', 'harbor.evaluator', 'harbor.compare', 'harbor.gate'])
const OBJECT_KINDS = new Set(['workspace', 'job', 'trial', 'criterion', 'evidence', 'candidate', 'dataset', 'evaluator', 'hypothesis', 'compare', 'gate', 'gate-reason', 'metric', 'finding', 'attempt', 'exception', 'evaluator-source', 'trial-set'])
const STAGES = new Set(['candidate', 'dataset', 'integration', 'renderer', 'judge', 'meta', 'reporter', 'optimizer', 'gate'])
const DETAIL_TABS = new Set(['summary', 'output', 'scores', 'evidence', 'attempts', 'audit'])
const FILTER_KEYS = new Set(['status', 'validity', 'segment'])
const FILTER_STATUSES = new Set(['pending', 'queued', 'starting', 'running-agent', 'evaluating', 'completed', 'completed-unscored', 'candidate-quality-failed', 'infrastructure-error', 'evaluation-error', 'failed', 'cancelled', 'timed-out'])
const FILTER_VALIDITIES = new Set(['true', 'false'])
const SORTS = new Set(['dataset-order', 'latest-completed', 'lowest-score', 'errors'])
const TOKEN_PATTERN = /^hctx_[A-Za-z0-9_-]{20,80}$/
const STABLE_ID_PATTERN = /^(?:@?[\p{L}\p{N}][\p{L}\p{N}._:@+-]*|@[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+)$/u
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:+-]*$/
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/
const ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/
const EVIDENCE_REF_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}._:@+#/+-]{0,319}$/u
const SECRET_VALUE_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}/i,
  /\b(?:sk|rk|pk|ghp|gho|ghu|github_pat|xox[baprs])-[_A-Za-z0-9-]{12,}\b/i,
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
  /\b(?:api[_-]?key|access[_-]?token|auth(?:orization)?|cookie|password|passwd|secret)\s*[:=]\s*\S{6,}/i,
]
const SECRET_KEY_NAMES = new Set(['apikey', 'authorization', 'authtoken', 'accesstoken', 'refreshtoken', 'bearertoken', 'secretaccesskey', 'cookie', 'cookies', 'header', 'headers', 'password', 'passwd', 'privatekey', 'secret', 'secrets', 'token'])
const LOCATION_KEY_PARTS = ['absoluteurl', 'filepath', 'pathname', 'projectpath', 'directory', 'workingdirectory', 'cwd', 'href', 'uri', 'url']

const ROUTE_RULES = Object.freeze({
  'harbor.home': { required: [], allowed: [], objectKinds: new Set(['workspace']) },
  'harbor.job': { required: ['job'], allowed: ['job', 'stage'], objectKinds: new Set(['job', 'candidate', 'dataset', 'hypothesis', 'gate-reason', 'metric', 'trial-set']) },
  'harbor.trial.detail': { required: ['job', 'trial'], allowed: ['job', 'stage', 'trial', 'detailTab', 'criterion', 'evidenceRef'], objectKinds: new Set(['trial', 'criterion', 'evidence', 'finding', 'attempt', 'exception']) },
  'harbor.evaluator': { required: ['job'], allowed: ['job', 'stage'], objectKinds: new Set(['job', 'evaluator', 'evaluator-source']) },
  'harbor.compare': { required: ['job', 'baseline', 'candidate'], allowed: ['job', 'stage', 'baseline', 'candidate'], objectKinds: new Set(['compare']) },
  'harbor.gate': { required: ['job', 'baseline', 'candidate', 'policy', 'policyVersion', 'policyDigest', 'reportDigest'], allowed: ['job', 'stage', 'baseline', 'candidate', 'policy', 'policyVersion', 'policyDigest', 'reportDigest'], objectKinds: new Set(['gate']) },
})

function fail(code, message) {
  const error = new Error(`${code}: ${message}`)
  error.code = code
  throw error
}

function canonicalKey(key) {
  return String(key).replace(/[^A-Za-z0-9]/g, '').toLowerCase()
}

function isLocationKey(key) {
  const normalized = canonicalKey(key)
  return LOCATION_KEY_PARTS.some(part => normalized === part || normalized.endsWith(part))
}

function looksLikeLocation(value) {
  if (/^(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/|blob:|data:|file:|javascript:|mailto:|www\.)/i.test(value)) return true
  if (/^(?:\/|\\|~[\\/]|\.{1,2}[\\/]|[A-Za-z]:[\\/])/.test(value)) return true
  if (value.includes('\\')) return true
  return value.includes('/') && !/^@[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(value)
}

function isSafeEvidenceRef(value) {
  return typeof value === 'string'
    && EVIDENCE_REF_PATTERN.test(value)
    && !/^(?:[A-Za-z][A-Za-z0-9+.-]*:|[\\/~]|\.{1,2}[\\/])/.test(value)
    && !value.includes('\\')
    && !value.split('/').includes('..')
    && !SECRET_VALUE_PATTERNS.some(pattern => pattern.test(value))
}

function assertSafeJsonTree(value, name = 'context', depth = 0, seen = new WeakSet()) {
  if (depth > 12) fail('HARBOR_CONTEXT_INVALID', `${name} is nested too deeply`)
  if (value === null || value === undefined || typeof value === 'boolean') return
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('HARBOR_CONTEXT_INVALID', `${name} must be finite`)
    return
  }
  if (typeof value === 'string') {
    const isDeclaredSchema = name === 'context.schema' && value === HARBOR_UI_CONTEXT_SCHEMA
    const isEvidenceRef = name.endsWith('.evidenceRef') && isSafeEvidenceRef(value)
    if (!isDeclaredSchema && !isEvidenceRef && looksLikeLocation(value)) fail('HARBOR_CONTEXT_UNSAFE_VALUE', `${name} must not contain a URL or path`)
    if (SECRET_VALUE_PATTERNS.some(pattern => pattern.test(value))) fail('HARBOR_CONTEXT_SECRET_DETECTED', `${name} appears to contain a secret`)
    return
  }
  if (typeof value !== 'object') fail('HARBOR_CONTEXT_INVALID', `${name} must be JSON-compatible`)
  if (seen.has(value)) fail('HARBOR_CONTEXT_INVALID', `${name} must not contain a cycle`)
  seen.add(value)
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) assertSafeJsonTree(item, `${name}[${index}]`, depth + 1, seen)
  } else {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) fail('HARBOR_CONTEXT_INVALID', `${name} must be a plain object`)
    for (const [key, item] of Object.entries(value)) {
      const normalizedKey = canonicalKey(key)
      if (SECRET_KEY_NAMES.has(normalizedKey) || [...SECRET_KEY_NAMES].some(secret => normalizedKey.endsWith(secret))) fail('HARBOR_CONTEXT_SECRET_DETECTED', `${name}.${key} is not allowed`)
      if (isLocationKey(key)) fail('HARBOR_CONTEXT_UNSAFE_VALUE', `${name}.${key} must not contain a URL or path`)
      const childName = key === 'id' && value.kind === 'evidence' ? `${name}.evidenceRef` : `${name}.${key}`
      assertSafeJsonTree(item, childName, depth + 1, seen)
    }
  }
  seen.delete(value)
}

function assertRawPayloadSize(value) {
  let serialized
  try { serialized = JSON.stringify(value) } catch { fail('HARBOR_CONTEXT_INVALID', 'context must be JSON-compatible') }
  if (serialized === undefined) fail('HARBOR_CONTEXT_INVALID', 'context must be JSON-compatible')
  if (Buffer.byteLength(serialized, 'utf8') > MAX_UI_CONTEXT_BYTES) fail('HARBOR_CONTEXT_TOO_LARGE', `context payload exceeds ${MAX_UI_CONTEXT_BYTES} bytes`)
}

function record(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('HARBOR_CONTEXT_INVALID', `${name} must be an object`)
  return value
}

function string(value, name, { required = false, max = 256 } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) fail('HARBOR_CONTEXT_INVALID', `${name} is required`)
    return undefined
  }
  if (typeof value !== 'string') fail('HARBOR_CONTEXT_INVALID', `${name} must be a string`)
  const normalized = value.trim()
  if (!normalized && required) fail('HARBOR_CONTEXT_INVALID', `${name} is required`)
  if (normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) fail('HARBOR_CONTEXT_INVALID', `${name} is invalid`)
  return normalized || undefined
}

function stableId(value, name, { required = false, max = 240 } = {}) {
  const normalized = string(value, name, { required, max })
  if (normalized !== undefined && (!STABLE_ID_PATTERN.test(normalized) || normalized === '.' || normalized === '..')) fail('HARBOR_CONTEXT_INVALID', `${name} must be a stable ID`)
  return normalized
}

function evidenceRef(value, name, { required = false } = {}) {
  const normalized = string(value, name, { required, max: 320 })
  if (normalized !== undefined && !isSafeEvidenceRef(normalized)) fail('HARBOR_CONTEXT_INVALID', `${name} must be a safe opaque Evidence ref`)
  return normalized
}

function digest(value, name) {
  const normalized = string(value, name, { max: 72 })
  if (normalized !== undefined && !DIGEST_PATTERN.test(normalized)) fail('HARBOR_CONTEXT_INVALID', `${name} must be a sha256 digest`)
  return normalized
}

function boolean(value, name) {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') fail('HARBOR_CONTEXT_INVALID', `${name} must be boolean`)
  return value
}

function enumValue(value, name, values, { required = false } = {}) {
  const normalized = string(value, name, { required, max: 80 })
  if (normalized !== undefined && !values.has(normalized)) fail('HARBOR_CONTEXT_INVALID', `${name} is not supported`)
  return normalized
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined))
}

function compactNonEmpty(value) {
  const normalized = compact(value)
  return Object.keys(normalized).length ? normalized : undefined
}

function normalizeIdentity(value, name) {
  if (value === undefined) return undefined
  const source = record(value, name)
  const version = string(source.version, `${name}.version`, { max: 120 })
  if (version !== undefined && !VERSION_PATTERN.test(version)) fail('HARBOR_CONTEXT_INVALID', `${name}.version is invalid`)
  return compactNonEmpty({
    id: stableId(source.id, `${name}.id`, { required: true, max: 180 }),
    version,
    digest: digest(source.digest, `${name}.digest`),
  })
}

function normalizeObjectRef(value, name) {
  const source = record(value, name)
  const kind = enumValue(source.kind, `${name}.kind`, OBJECT_KINDS, { required: true })
  const policyVersion = string(source.policyVersion, `${name}.policyVersion`, { max: 120 })
  if (policyVersion !== undefined && !VERSION_PATTERN.test(policyVersion)) fail('HARBOR_CONTEXT_INVALID', `${name}.policyVersion is invalid`)
  const normalized = compact({
    kind,
    id: kind === 'evidence'
      ? evidenceRef(source.id, `${name}.id`, { required: true })
      : stableId(source.id, `${name}.id`, { required: true, max: 240 }),
    job: stableId(source.job, `${name}.job`, { max: 240 }),
    stage: enumValue(source.stage, `${name}.stage`, STAGES),
    trial: stableId(source.trial, `${name}.trial`, { max: 240 }),
    criterion: stableId(source.criterion, `${name}.criterion`, { max: 180 }),
    evidenceRef: evidenceRef(source.evidenceRef, `${name}.evidenceRef`),
    baseline: stableId(source.baseline, `${name}.baseline`, { max: 240 }),
    candidate: stableId(source.candidate, `${name}.candidate`, { max: 240 }),
    comparisonDigest: digest(source.comparisonDigest, `${name}.comparisonDigest`),
    policy: stableId(source.policy, `${name}.policy`, { max: 180 }),
    policyVersion,
    policyDigest: digest(source.policyDigest, `${name}.policyDigest`),
    reportDigest: digest(source.reportDigest, `${name}.reportDigest`),
    sourceDigest: digest(source.sourceDigest, `${name}.sourceDigest`),
    sourceRole: enumValue(source.sourceRole, `${name}.sourceRole`, new Set(['evaluator', 'rubric'])),
    startLine: source.startLine,
    endLine: source.endLine,
    selectionCount: source.selectionCount,
  })
  if (kind === 'trial-set' ? !Number.isInteger(source.selectionCount) || source.selectionCount < 1 || source.selectionCount > 1000 : source.selectionCount !== undefined) fail('HARBOR_CONTEXT_INVALID', `${name}.selectionCount must be a bounded Trial set count`)
  const local = ['hypothesis', 'gate-reason', 'metric', 'finding', 'attempt', 'exception', 'evaluator-source', 'trial-set'].includes(kind)
  if (!local && normalized.sourceDigest) fail('HARBOR_CONTEXT_INVALID', `${name}.sourceDigest is not valid for ${kind}`)
  if (local && kind !== 'hypothesis' && !normalized.sourceDigest) fail('HARBOR_CONTEXT_INVALID', `${name}.sourceDigest is required`)
  for (const field of ['sourceRole', 'startLine', 'endLine']) {
    if (normalized[field] !== undefined && kind !== 'evaluator-source') fail('HARBOR_CONTEXT_INVALID', `${name}.${field} is only valid for evaluator-source`)
  }
  for (const field of ['startLine', 'endLine']) {
    if (normalized[field] !== undefined && (!Number.isSafeInteger(normalized[field]) || normalized[field] < 1 || normalized[field] > 10000)) fail('HARBOR_CONTEXT_INVALID', `${name}.${field} must be a positive bounded line number`)
  }
  if (kind === 'evaluator-source' && (!normalized.sourceRole || (normalized.startLine === undefined) !== (normalized.endLine === undefined))) fail('HARBOR_CONTEXT_INVALID', `${name} requires a source role and a complete optional line range`)
  const require = field => { if (!normalized[field]) fail('HARBOR_CONTEXT_INVALID', `${name}.${field} is required for ${kind}`) }
  if (kind === 'workspace') {
    for (const field of ['job', 'stage', 'trial', 'criterion', 'evidenceRef']) if (normalized[field] !== undefined) fail('HARBOR_CONTEXT_INVALID', `${name}.${field} is not valid for workspace`)
  }
  if (kind !== 'workspace') require('job')
  if (['trial', 'criterion', 'evidence', 'finding', 'attempt', 'exception'].includes(kind)) require('trial')
  if (kind === 'criterion') require('criterion')
  if (kind === 'evidence') require('evidenceRef')
  if (kind === 'compare') {
    for (const field of ['baseline', 'candidate', 'comparisonDigest']) require(field)
    if (normalized.job !== normalized.candidate) fail('HARBOR_CONTEXT_INVALID', `${name}.job must match candidate for compare`)
    for (const field of ['policy', 'policyVersion', 'policyDigest', 'reportDigest']) if (normalized[field] !== undefined) fail('HARBOR_CONTEXT_INVALID', `${name}.${field} is not valid for compare`)
  } else if (kind === 'gate') {
    for (const field of ['baseline', 'candidate', 'policy', 'policyVersion', 'policyDigest', 'reportDigest']) require(field)
    if (normalized.job !== normalized.candidate) fail('HARBOR_CONTEXT_INVALID', `${name}.job must match candidate for gate`)
    if (normalized.comparisonDigest !== undefined) fail('HARBOR_CONTEXT_INVALID', `${name}.comparisonDigest is not valid for gate`)
  } else {
    for (const field of ['baseline', 'candidate', 'comparisonDigest', 'policy', 'policyVersion', 'policyDigest', 'reportDigest']) {
      if (normalized[field] !== undefined) fail('HARBOR_CONTEXT_INVALID', `${name}.${field} is only valid for compare or gate`)
    }
  }
  const canonical = kind === 'workspace' ? normalized.id : kind === 'job' ? normalized.job : kind === 'trial' ? normalized.trial : kind === 'criterion' ? normalized.criterion : kind === 'evidence' ? normalized.evidenceRef : kind === 'compare' ? normalized.comparisonDigest : kind === 'gate' ? normalized.reportDigest : undefined
  if (canonical !== undefined && normalized.id !== canonical) fail('HARBOR_CONTEXT_INVALID', `${name}.id must match its typed reference`)
  return normalized
}

function normalizeRoute(value) {
  const source = record(value, 'context.route')
  const name = enumValue(source.name, 'context.route.name', ROUTES, { required: true })
  const params = source.params === undefined ? {} : record(source.params, 'context.route.params')
  const normalizedParams = compact({
    job: stableId(params.job, 'context.route.params.job', { max: 240 }),
    stage: enumValue(params.stage, 'context.route.params.stage', STAGES),
    trial: stableId(params.trial, 'context.route.params.trial', { max: 240 }),
    detailTab: enumValue(params.detailTab, 'context.route.params.detailTab', DETAIL_TABS),
    criterion: stableId(params.criterion, 'context.route.params.criterion', { max: 180 }),
    evidenceRef: evidenceRef(params.evidenceRef, 'context.route.params.evidenceRef'),
    baseline: stableId(params.baseline, 'context.route.params.baseline', { max: 240 }),
    candidate: stableId(params.candidate, 'context.route.params.candidate', { max: 240 }),
    policy: stableId(params.policy, 'context.route.params.policy', { max: 180 }),
    policyVersion: string(params.policyVersion, 'context.route.params.policyVersion', { max: 120 }),
    policyDigest: digest(params.policyDigest, 'context.route.params.policyDigest'),
    reportDigest: digest(params.reportDigest, 'context.route.params.reportDigest'),
  })
  if (normalizedParams.policyVersion !== undefined && !VERSION_PATTERN.test(normalizedParams.policyVersion)) fail('HARBOR_CONTEXT_INVALID', 'context.route.params.policyVersion is invalid')
  const rule = ROUTE_RULES[name]
  for (const key of rule.required) if (normalizedParams[key] === undefined) fail('HARBOR_CONTEXT_INVALID', `context.route.params.${key} is required for ${name}`)
  for (const key of Object.keys(normalizedParams)) if (!rule.allowed.includes(key)) fail('HARBOR_CONTEXT_INVALID', `context.route.params.${key} is not valid for ${name}`)
  if (normalizedParams.criterion && normalizedParams.evidenceRef) fail('HARBOR_CONTEXT_INVALID', 'a route cannot focus a criterion and evidence at the same time')
  return { name, params: normalizedParams }
}

function normalizeViewState(value) {
  if (value === undefined) return undefined
  const source = record(value, 'context.viewState')
  const filters = source.filters === undefined ? undefined : record(source.filters, 'context.viewState.filters')
  const normalizedFilters = filters === undefined ? undefined : Object.fromEntries(Object.entries(filters)
    .filter(([key]) => FILTER_KEYS.has(key))
    .map(([key, item]) => {
      if (key === 'status') return [key, enumValue(item, 'context.viewState.filters.status', FILTER_STATUSES)]
      if (key === 'validity') return [key, enumValue(item, 'context.viewState.filters.validity', FILTER_VALIDITIES)]
      return [key, stableId(item, 'context.viewState.filters.segment', { max: 120 })]
    })
    .filter(([, item]) => item !== undefined))
  return compactNonEmpty({
    detailTab: enumValue(source.detailTab, 'context.viewState.detailTab', DETAIL_TABS),
    filters: normalizedFilters && Object.keys(normalizedFilters).length ? normalizedFilters : undefined,
    sort: enumValue(source.sort, 'context.viewState.sort', SORTS),
    segment: stableId(source.segment, 'context.viewState.segment', { max: 120 }),
  })
}

function normalizeObservedAt(value) {
  const observedAt = string(value, 'context.observedAt', { required: true, max: 80 })
  if (!ISO_8601_PATTERN.test(observedAt) || Number.isNaN(Date.parse(observedAt))) fail('HARBOR_CONTEXT_INVALID', 'context.observedAt must be ISO-8601')
  return new Date(observedAt).toISOString()
}

function assertRefMatchesRoute(ref, route, name) {
  const params = route.params
  if (ref.job !== undefined && ref.job !== params.job) fail('HARBOR_CONTEXT_INVALID', `${name}.job does not match the route`)
  if (ref.trial !== undefined && ref.trial !== params.trial) fail('HARBOR_CONTEXT_INVALID', `${name}.trial does not match the route`)
  if (ref.stage !== undefined && params.stage !== undefined && ref.stage !== params.stage) fail('HARBOR_CONTEXT_INVALID', `${name}.stage does not match the route`)
  if (ref.criterion !== undefined && params.criterion !== undefined && ref.criterion !== params.criterion) fail('HARBOR_CONTEXT_INVALID', `${name}.criterion does not match the route`)
  if (ref.evidenceRef !== undefined && params.evidenceRef !== undefined && ref.evidenceRef !== params.evidenceRef) fail('HARBOR_CONTEXT_INVALID', `${name}.evidenceRef does not match the route`)
  for (const field of ['baseline', 'candidate', 'policy', 'policyVersion', 'policyDigest', 'reportDigest']) {
    if (ref[field] !== undefined && ref[field] !== params[field]) fail('HARBOR_CONTEXT_INVALID', `${name}.${field} does not match the route`)
  }
  if (['trial', 'criterion', 'evidence'].includes(ref.kind) && route.name !== 'harbor.trial.detail') fail('HARBOR_CONTEXT_INVALID', `${name}.kind is not valid for ${route.name}`)
}

function assertContextConsistency(context) {
  const { route, object, selection, viewState } = context
  const rule = ROUTE_RULES[route.name]
  if (route.name === 'harbor.compare' && object?.kind !== 'compare') fail('HARBOR_CONTEXT_INVALID', 'harbor.compare requires one concrete Compare object')
  if (route.name === 'harbor.gate' && object?.kind !== 'gate') fail('HARBOR_CONTEXT_INVALID', 'harbor.gate requires one concrete Gate object')
  if (object) {
    if (!rule.objectKinds.has(object.kind)) fail('HARBOR_CONTEXT_INVALID', `context.object.kind is not valid for ${route.name}`)
    assertRefMatchesRoute(object, route, 'context.object')
    if (object.kind === 'workspace' && object.id !== context.workspace) fail('HARBOR_CONTEXT_INVALID', 'context.object.id does not match context.workspace')
    if (object.kind === 'criterion' && object.criterion !== route.params.criterion) fail('HARBOR_CONTEXT_INVALID', 'context.object.criterion must match the route focus')
    if (object.kind === 'evidence' && object.evidenceRef !== route.params.evidenceRef) fail('HARBOR_CONTEXT_INVALID', 'context.object.evidenceRef must match the route focus')
  }
  const seen = new Set()
  for (const [index, ref] of (selection ?? []).entries()) {
    const name = `context.selection[${index}]`
    assertRefMatchesRoute(ref, route, name)
    const key = JSON.stringify([ref.kind, ref.id, ref.job, ref.trial])
    if (seen.has(key)) fail('HARBOR_CONTEXT_INVALID', 'context.selection contains a duplicate reference')
    seen.add(key)
  }
  const focused = selection?.at(-1)
  if (route.params.criterion && !(focused?.kind === 'criterion' && focused.criterion === route.params.criterion)) fail('HARBOR_CONTEXT_INVALID', 'context.route.params.criterion must match the final explicit selection')
  if (route.params.evidenceRef && !(focused?.kind === 'evidence' && focused.evidenceRef === route.params.evidenceRef)) fail('HARBOR_CONTEXT_INVALID', 'context.route.params.evidenceRef must match the final explicit selection')
  if (route.params.detailTab && viewState?.detailTab && route.params.detailTab !== viewState.detailTab) fail('HARBOR_CONTEXT_INVALID', 'context.viewState.detailTab does not match the route')
}

export function normalizeHarborUiContext(value, expectedSessionId) {
  assertRawPayloadSize(value)
  const source = record(value, 'context')
  const schema = string(source.schema, 'context.schema', { required: true, max: 80 })
  if (schema !== HARBOR_UI_CONTEXT_SCHEMA) fail('HARBOR_CONTEXT_INVALID', `context.schema must be ${HARBOR_UI_CONTEXT_SCHEMA}`)
  assertSafeJsonTree(value)
  const sessionId = stableId(source.sessionId, 'context.sessionId', { required: true, max: 240 })
  if (expectedSessionId && sessionId !== expectedSessionId) fail('HARBOR_CONTEXT_SESSION_MISMATCH', 'context session does not match the request')
  const pageSessionId = stableId(source.pageSessionId, 'context.pageSessionId', { required: true, max: 240 })
  if (!Number.isSafeInteger(source.generation) || source.generation < 1) fail('HARBOR_CONTEXT_INVALID', 'context.generation must be a positive integer')
  const workspace = stableId(source.workspace, 'context.workspace', { required: true, max: 240 })
  const selection = source.selection === undefined ? undefined : source.selection
  if (selection !== undefined && (!Array.isArray(selection) || selection.length > 25)) fail('HARBOR_CONTEXT_INVALID', 'context.selection must contain at most 25 references')
  const identitiesSource = source.identities === undefined ? undefined : record(source.identities, 'context.identities')
  const flagsSource = source.flags === undefined ? undefined : record(source.flags, 'context.flags')
  const normalized = compact({
    schema: HARBOR_UI_CONTEXT_SCHEMA,
    sessionId,
    pageSessionId,
    generation: source.generation,
    workspace,
    route: normalizeRoute(source.route),
    object: source.object === undefined ? undefined : normalizeObjectRef(source.object, 'context.object'),
    selection: selection?.map((item, index) => normalizeObjectRef(item, `context.selection[${index}]`)),
    viewState: normalizeViewState(source.viewState),
    identities: identitiesSource === undefined ? undefined : compactNonEmpty({
      candidate: normalizeIdentity(identitiesSource.candidate, 'context.identities.candidate'),
      dataset: normalizeIdentity(identitiesSource.dataset, 'context.identities.dataset'),
      context: normalizeIdentity(identitiesSource.context, 'context.identities.context'),
      stack: normalizeIdentity(identitiesSource.stack, 'context.identities.stack'),
      evaluator: normalizeIdentity(identitiesSource.evaluator, 'context.identities.evaluator'),
    }),
    flags: flagsSource === undefined ? undefined : compactNonEmpty({
      legacy: boolean(flagsSource.legacy, 'context.flags.legacy'),
      comparable: boolean(flagsSource.comparable, 'context.flags.comparable'),
      scoreValid: boolean(flagsSource.scoreValid, 'context.flags.scoreValid'),
    }),
    artifactRevision: digest(source.artifactRevision, 'context.artifactRevision'),
    observedAt: normalizeObservedAt(source.observedAt),
  })
  assertContextConsistency(normalized)
  if (Buffer.byteLength(JSON.stringify(normalized), 'utf8') > MAX_UI_CONTEXT_BYTES) fail('HARBOR_CONTEXT_TOO_LARGE', `context payload exceeds ${MAX_UI_CONTEXT_BYTES} bytes`)
  return normalized
}

export function harborContextLabel(context) {
  const selected = context.selection?.at(-1)
  if (selected?.kind === 'criterion') return `Trial ${selected.trial ?? context.object?.trial ?? '—'} · ${selected.criterion ?? selected.id ?? 'Criterion'}`
  if (selected?.kind === 'evidence') return `Trial ${selected.trial ?? context.object?.trial ?? '—'} · Evidence`
  const object = context.object
  if (object?.kind === 'trial') return `Trial ${object.trial ?? object.id ?? '—'}`
  if (object?.kind === 'job') return `Job ${object.job ?? object.id ?? '—'}`
  return `Harbor · ${context.route.params.job ?? context.workspace}`
}

export function harborContextMention(context, token) {
  const label = harborContextLabel(context).replace(/[\[\]()]/g, '')
  return `@harbor[${label}](${token})`
}

export function harborNavigationTarget(context) {
  const selected = context.selection?.at(-1)
  return compact({
    route: context.route.name,
    workspace: context.workspace,
    job: context.route.params.job ?? context.object?.job,
    stage: context.route.params.stage ?? context.object?.stage,
    trial: selected?.trial ?? context.route.params.trial ?? context.object?.trial,
    detailTab: context.route.params.detailTab ?? context.viewState?.detailTab,
    criterion: selected?.criterion ?? context.route.params.criterion ?? context.object?.criterion,
    evidenceRef: selected?.evidenceRef ?? context.route.params.evidenceRef ?? context.object?.evidenceRef,
    baseline: context.route.params.baseline ?? context.object?.baseline,
    candidate: context.route.params.candidate ?? context.object?.candidate,
    policy: context.route.params.policy ?? context.object?.policy,
    policyVersion: context.route.params.policyVersion ?? context.object?.policyVersion,
    policyDigest: context.route.params.policyDigest ?? context.object?.policyDigest,
    reportDigest: context.route.params.reportDigest ?? context.object?.reportDigest,
    filters: context.viewState?.filters,
    sort: context.viewState?.sort,
  })
}

function positiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer`)
  return value
}

function normalizeProjectRoot(value) {
  if (typeof value !== 'string' || !value.trim()) fail('HARBOR_CONTEXT_INVALID', 'projectRoot is required')
  return path.resolve(value)
}

function streamKey(sessionId, pageSessionId) {
  return JSON.stringify([sessionId, pageSessionId])
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const item of Object.values(value)) deepFreeze(item)
  return Object.freeze(value)
}

function publication(entry) {
  return {
    schema: HARBOR_UI_CONTEXT_SCHEMA,
    contextSnapshotId: entry.token,
    context: entry.context,
    generation: entry.context.generation,
    digest: entry.digest,
    expiresAt: new Date(entry.expiresAtMs).toISOString(),
    label: harborContextLabel(entry.context),
    reference: harborContextMention(entry.context, entry.token),
  }
}

export class HarborUiContextRegistry {
  constructor({ ttlMs = DEFAULT_UI_CONTEXT_TTL_MS, maxEntries = DEFAULT_UI_CONTEXT_MAX_ENTRIES, maxEntriesPerSession = Math.min(DEFAULT_UI_CONTEXT_MAX_ENTRIES_PER_SESSION, maxEntries), now = () => Date.now(), random = size => randomBytes(size) } = {}) {
    this.ttlMs = positiveInteger(ttlMs, 'ttlMs')
    this.maxEntries = positiveInteger(maxEntries, 'maxEntries')
    this.maxEntriesPerSession = positiveInteger(maxEntriesPerSession, 'maxEntriesPerSession')
    if (this.maxEntriesPerSession > this.maxEntries) throw new TypeError('maxEntriesPerSession must not exceed maxEntries')
    this.now = now
    this.random = random
    this.entries = new Map()
    this.streams = new Map()
  }

  issue({ sessionId, context, projectRoot }) {
    const normalized = deepFreeze(normalizeHarborUiContext(context, sessionId))
    const root = normalizeProjectRoot(projectRoot)
    const createdAtMs = this.now()
    this.prune(createdAtMs)
    const digestValue = `sha256:${createHash('sha256').update(JSON.stringify(normalized)).digest('hex')}`
    const key = streamKey(normalized.sessionId, normalized.pageSessionId)
    const stream = this.streams.get(key)
    if (stream) {
      if (stream.projectRoot !== root) fail('HARBOR_CONTEXT_PROJECT_MISMATCH', 'Harbor page context cannot move to a different project')
      if (normalized.generation < stream.generation) fail('HARBOR_CONTEXT_STALE_GENERATION', 'context.generation is older than the current page generation')
      if (normalized.generation === stream.generation) {
        if (stream.digest !== digestValue || stream.projectRoot !== root) fail('HARBOR_CONTEXT_GENERATION_CONFLICT', 'context.generation was already issued with different state')
        const existing = this.entries.get(stream.token)
        if (existing) return publication(existing)
      }
    }
    let sessionEntries = 0
    for (const entry of this.entries.values()) if (entry.sessionId === normalized.sessionId) sessionEntries += 1
    if (sessionEntries >= this.maxEntriesPerSession) fail('HARBOR_CONTEXT_CAPACITY', 'Harbor context capacity for this Session has been reached')
    if (this.entries.size >= this.maxEntries) fail('HARBOR_CONTEXT_CAPACITY', 'Harbor context registry capacity has been reached')
    let token
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = `hctx_${Buffer.from(this.random(24)).toString('base64url')}`
      if (TOKEN_PATTERN.test(candidate) && !this.entries.has(candidate)) { token = candidate; break }
    }
    if (!token) fail('HARBOR_CONTEXT_CAPACITY', 'unable to allocate a unique context token')
    const expiresAtMs = createdAtMs + this.ttlMs
    const entry = Object.freeze({ token, sessionId: normalized.sessionId, context: normalized, projectRoot: root, digest: digestValue, createdAtMs, expiresAtMs })
    this.entries.set(token, entry)
    this.streams.set(key, Object.freeze({ sessionId: normalized.sessionId, pageSessionId: normalized.pageSessionId, generation: normalized.generation, digest: digestValue, token, projectRoot: root, expiresAtMs }))
    return publication(entry)
  }

  resolve({ contextSnapshotId, sessionId, projectRoot }) {
    const token = string(contextSnapshotId, 'contextSnapshotId', { required: true, max: 100 })
    if (!TOKEN_PATTERN.test(token)) fail('HARBOR_CONTEXT_INVALID_TOKEN', 'contextSnapshotId is invalid')
    const ownerSessionId = stableId(sessionId, 'sessionId', { required: true, max: 240 })
    const root = normalizeProjectRoot(projectRoot)
    this.prune(this.now())
    const entry = this.entries.get(token)
    if (!entry) fail('HARBOR_CONTEXT_EXPIRED', 'Harbor context is unavailable or expired; bind the current page again')
    if (entry.sessionId !== ownerSessionId) fail('HARBOR_CONTEXT_SESSION_MISMATCH', 'Harbor context belongs to a different DSH Session')
    if (root !== entry.projectRoot) fail('HARBOR_CONTEXT_PROJECT_MISMATCH', 'Harbor context belongs to a different project')
    return entry
  }

  prune(now = this.now()) {
    for (const [token, entry] of this.entries) if (entry.expiresAtMs <= now) this.entries.delete(token)
    for (const [key, stream] of this.streams) if (stream.expiresAtMs <= now || !this.entries.has(stream.token)) this.streams.delete(key)
  }
}
