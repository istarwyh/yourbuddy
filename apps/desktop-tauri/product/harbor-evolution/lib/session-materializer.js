import { chmod, lstat, mkdir, mkdtemp, realpath, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { canonicalDigest } from './session-selection.js'
import { DEFAULT_REDACTION_POLICY } from './session-redaction.js'

function isoCompact(now) {
  return now.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '')
}

function routeName(route) {
  return `${route.provider}/${route.model}`
}

function materializeScan(scan, scope) {
  if (scan === undefined) return undefined
  if (
    !scan || scan.scope !== scope
    || ![scan.listedCount, scan.candidateCount, scan.readCount, scan.unscannedCount]
      .every(value => Number.isSafeInteger(value) && value >= 0)
    || scan.candidateCount > scan.listedCount
    || scan.readCount + scan.unscannedCount !== scan.candidateCount
    || scan.partial !== (scan.unscannedCount > 0)
    || scan.windowOrder !== (scope === 'exact-cwd' ? 'all-candidates' : 'created-at-desc')
    || scan.selectionOrder !== 'last-activity-desc'
  ) {
    throw new Error('HISTORICAL_BATCH_SCAN_INVALID')
  }
  return {
    scope,
    listed_count: scan.listedCount,
    candidate_count: scan.candidateCount,
    read_count: scan.readCount,
    unscanned_count: scan.unscannedCount,
    partial: scan.partial,
    window_order: scan.windowOrder,
    selection_order: scan.selectionOrder,
  }
}

export function buildHistoricalGenerationBatch({
  projectRoot, selections, observations, limit = 10, createdAfter,
  scope = 'exact-cwd', scan, now = new Date(),
}) {
  if (!['exact-cwd', 'dsh-history'].includes(scope)) {
    throw new Error('HISTORICAL_BATCH_SCOPE_INVALID')
  }
  const selectionScan = materializeScan(scan, scope)
  if (!Array.isArray(selections) || !selections.length || selections.length > 10) {
    throw new Error('HISTORICAL_BATCH_SIZE_INVALID: a batch requires 1 to 10 Session observations')
  }
  if (!Array.isArray(observations) || observations.length !== selections.length) {
    throw new Error('HISTORICAL_BATCH_OBSERVATION_MISMATCH')
  }
  const seed = canonicalDigest(
    observations.map(observation => observation.digest),
    'harbor-dsh-historical-batch-id-v1',
  ).slice('sha256:'.length, 'sha256:'.length + 8)
  const batchId = `recent-${isoCompact(now)}-${seed}`.toLowerCase()
  const records = selections.map((selection, index) => {
    const observation = observations[index]
    if (observation.trial_id !== selection.trialId) {
      throw new Error('HISTORICAL_BATCH_TRIAL_ID_MISMATCH')
    }
    return {
      trial_id: selection.trialId,
      record_kind: 'dsh-session',
      source_ref: selection.sourceRef,
      captured_through_seq: selection.capturedThroughSeq,
      source_digest: selection.sourceDigest,
      ...(typeof selection.header?.cwd === 'string' && path.isAbsolute(selection.header.cwd)
        ? { source_project_digest: canonicalDigest(
            { cwd: path.resolve(selection.header.cwd) }, 'harbor-dsh-project-cwd-v1',
          ) }
        : {}),
      observation_digest: observation.digest,
      last_activity_at: observation.source.last_activity_at,
      generator: {
        agent_preset: observation.generator.agent_preset,
        model_routes: [...new Map(observation.generator.model_segments.map(segment => {
          const route = {
            provider: segment.provider,
            model: segment.model,
            ...(segment.reasoning_effort ? { reasoning_effort: segment.reasoning_effort } : {}),
          }
          return [routeName(route), route]
        })).values()],
        homogeneous: new Set(observation.generator.model_segments.map(routeName)).size <= 1,
      },
      observation_path: `sessions/${selection.trialId}.json`,
    }
  })
  const presets = [...new Set(records.map(record => record.generator.agent_preset).filter(Boolean))].sort()
  const routes = [...new Set(records.flatMap(record => record.generator.model_routes.map(routeName)))].sort()
  const batch = {
    schema_version: 1,
    protocol: 'historical-generation-batch/v1',
    batch_id: batchId,
    created_at: now.toISOString(),
    project: {
      // This identifies the output workspace, not the projects the sessions came from.
      cwd_digest: canonicalDigest({ cwd: path.resolve(projectRoot) }, 'harbor-dsh-project-cwd-v1'),
    },
    selection: {
      scope,
      order: 'last-activity-desc',
      requested_limit: limit,
      selected_count: records.length,
      current_session_excluded: true,
      ...(createdAfter === undefined ? {} : { created_after: new Date(createdAfter).toISOString() }),
      ...(selectionScan === undefined ? {} : { scan: selectionScan }),
    },
    source: {
      kind: 'dsh-session',
      adapter: 'dsh-session-query',
      session_format_versions: [...new Set(selections.map(item => item.header.version))].sort(),
    },
    redaction_policy: DEFAULT_REDACTION_POLICY,
    records,
    generator_population: {
      homogeneous: presets.length <= 1 && routes.length <= 1,
      agent_presets: presets,
      model_routes: routes,
    },
  }
  const serialized = JSON.stringify(batch)
  for (const selection of selections) {
    const canary = String(selection.rawSessionId ?? '')
    if (canary.length >= 8 && serialized.includes(canary)) {
      throw new Error('SESSION_REDACTION_FAILED: a raw Session id survived Batch materialization')
    }
  }
  batch.digest = canonicalDigest(batch, 'harbor-dsh-historical-generation-batch-v1')
  return batch
}

async function writePrivateJson(pathname, value) {
  await writeFile(pathname, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
    flag: 'wx',
  })
  await chmod(pathname, 0o600)
}

function unsafePrivateEvidencePath(label) {
  return new Error(
    `PRIVATE_EVIDENCE_PATH_UNSAFE: ${label} must be a real directory inside projectRoot, not a symlink or non-directory`,
  )
}

async function ensureSafeDirectory(directory, {
  parentReal,
  label,
  mode = 0o700,
  enforceMode = true,
}) {
  try {
    await mkdir(directory, { mode })
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
  }
  const details = await lstat(directory)
  if (details.isSymbolicLink() || !details.isDirectory()) {
    throw unsafePrivateEvidencePath(label)
  }
  const resolved = await realpath(directory)
  if (path.dirname(resolved) !== parentReal) {
    throw unsafePrivateEvidencePath(label)
  }
  if (enforceMode) await chmod(directory, mode)
  return resolved
}

export async function writePrivateHistoricalBatch({ projectRoot, batch, observations }) {
  const resolvedProjectRoot = path.resolve(projectRoot)
  const projectReal = await realpath(resolvedProjectRoot)
  const projectDetails = await lstat(projectReal)
  if (!projectDetails.isDirectory()) {
    throw unsafePrivateEvidencePath('projectRoot')
  }
  const harborRoot = path.join(resolvedProjectRoot, '.harbor')
  const harborReal = await ensureSafeDirectory(harborRoot, {
    parentReal: projectReal,
    label: '.harbor',
    enforceMode: false,
  })
  const privateRoot = path.join(harborRoot, 'private')
  const privateReal = await ensureSafeDirectory(privateRoot, {
    parentReal: harborReal,
    label: '.harbor/private',
  })
  const batchesRoot = path.join(privateRoot, 'session-batches')
  try {
    await writeFile(path.join(privateRoot, '.gitignore'), '*\n!.gitignore\n', {
      encoding: 'utf8', mode: 0o600, flag: 'wx',
    })
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
  }
  await ensureSafeDirectory(batchesRoot, {
    parentReal: privateReal,
    label: '.harbor/private/session-batches',
  })
  const staging = await mkdtemp(path.join(batchesRoot, '.staging-'))
  const target = path.join(batchesRoot, batch.batch_id)
  try {
    await chmod(staging, 0o700)
    const sessions = path.join(staging, 'sessions')
    await mkdir(sessions, { mode: 0o700 })
    for (const observation of observations) {
      await writePrivateJson(path.join(sessions, `${observation.trial_id}.json`), observation)
    }
    const redactionReport = {
      schema_version: 1,
      policy: batch.redaction_policy,
      sessions: observations.map(observation => ({
        trial_id: observation.trial_id,
        ...observation.redaction,
      })),
    }
    await writePrivateJson(path.join(staging, 'session-redaction-report.json'), redactionReport)
    await writePrivateJson(path.join(staging, 'historical-generation-batch.json'), batch)
    await rename(staging, target)
    return {
      batchDir: target,
      batchPath: path.join(target, 'historical-generation-batch.json'),
      redactionReportPath: path.join(target, 'session-redaction-report.json'),
    }
  } catch (error) {
    await rm(staging, { recursive: true, force: true })
    throw error
  }
}
