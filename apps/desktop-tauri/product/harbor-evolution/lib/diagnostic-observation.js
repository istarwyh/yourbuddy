import { constants } from 'node:fs'
import { lstat, open, readFile, readlink } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { resolveWithin } from './evolution.js'

const phases = new Set(['queued', 'preparing-environment', 'preparing-agent', 'loading-observation', 'running-agent', 'running-adapter', 'running-integration', 'rendering', 'evaluating', 'completed', 'completed-unscored', 'candidate-quality-failed', 'infrastructure-error', 'evaluation-error', 'cancelled'])
const fail = () => { throw Object.assign(new Error('HARBOR_DIAGNOSTIC_OBSERVATION_UNSAFE: Diagnostic evidence is missing or unsafe.'), { code: 'HARBOR_DIAGNOSTIC_OBSERVATION_UNSAFE' }) }

export async function pinDiagnosticEnvironment(runProcess, environment) {
  const env = { ...environment }
  let endpoint = env.DOCKER_HOST
  if (env.DOCKER_CONTEXT || !endpoint) {
    let context = env.DOCKER_CONTEXT
    if (!context) {
      const selected = await runProcess('docker', ['context', 'show'], { env, timeoutMs: 5000, maxOutputBytes: 1024 })
      if (selected.code !== 0) fail()
      context = selected.stdout.trim()
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}$/.test(context)) fail()
    const resolved = await runProcess('docker', ['context', 'inspect', context, '--format', '{{.Endpoints.docker.Host}}'], { env, timeoutMs: 5000, maxOutputBytes: 4096 })
    if (resolved.code !== 0) fail()
    endpoint = resolved.stdout.trim()
  }
  if (!/^unix:\/\/\/[^\r\n\0]{1,4000}$/.test(endpoint)) throw Object.assign(new Error('HARBOR_DIAGNOSTIC_RUNTIME_UNSUPPORTED: Bounded diagnostics currently require a local Docker Unix socket. Remote/TLS contexts are not enabled because immutable transport and cleanup ownership cannot yet be proven; no run was started.'), { code: 'HARBOR_DIAGNOSTIC_RUNTIME_UNSUPPORTED' })
  // Pin the endpoint, not merely its mutable context name. No TLS credentials
  // are copied and editing Docker's context definition cannot redirect a run.
  env.DOCKER_HOST = endpoint
  delete env.DOCKER_CONTEXT
  delete env.DOCKER_TLS
  delete env.DOCKER_TLS_VERIFY
  delete env.DOCKER_CERT_PATH
  return env
}

export async function readDiagnosticRuntimeIdentity({ runProcess, platform = process.platform, env }) {
  let machine, processDomain = ''
  if (platform === 'darwin') {
    const response = await runProcess('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { env, timeoutMs: 5000, maxOutputBytes: 64 * 1024 })
    if (response.code !== 0) fail()
    machine = response.stdout.match(/"IOPlatformUUID"\s*=\s*"([a-f0-9-]{36})"/i)?.[1] ?? ''
  } else if (platform === 'linux') {
    const info = await lstat('/etc/machine-id')
    if (!info.isFile() || info.size > 1024) fail()
    machine = (await readFile('/etc/machine-id', 'utf8')).trim()
    const namespace = await readlink('/proc/self/ns/pid')
    const boot = (await readFile('/proc/sys/kernel/random/boot_id', 'utf8')).trim()
    if (!/^pid:\[[0-9]+\]$/.test(namespace) || !/^[a-f0-9-]{36}$/.test(boot)) fail()
    processDomain = `:${namespace}:${boot}`
  } else fail()
  if (!/^[a-f0-9-]{16,64}$/i.test(machine)) fail()
  const docker = await runProcess('docker', ['info', '--format', '{{.ID}}'], { env, timeoutMs: 10_000, maxOutputBytes: 1024 })
  if (docker.code !== 0 || !/^[A-Za-z0-9:_.-]{8,200}$/.test(docker.stdout.trim())) fail()
  const digest = value => `sha256:${createHash('sha256').update(value).digest('hex')}`
  // Do not persist device IDs, daemon endpoints, context names or credentials.
  return { hostIdentity: digest(`${platform}:${machine.toLowerCase()}${processDomain}`), dockerIdentity: digest(docker.stdout.trim()) }
}

async function artifact(root, target) {
  const file = resolveWithin(root, target, 'diagnostic observation')
  let cursor = root
  for (const part of path.relative(root, file).split(path.sep)) {
    cursor = path.join(cursor, part)
    if ((await lstat(cursor)).isSymbolicLink()) fail()
  }
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const info = await handle.stat()
    if (!info.isFile() || info.size > 512 * 1024) fail()
    return JSON.parse(await handle.readFile('utf8'))
  } finally { await handle.close() }
}

async function evidence(config, operation, root, { tolerateLifecycleError = false } = {}) {
  if (!/^hop_[A-Za-z0-9_-]{1,100}$/.test(operation.operationId ?? '')) fail()
  const jobName = `diagnostic-${operation.operationId.slice(4)}`
  const directory = resolveWithin(root, path.join(config.jobsDir ?? 'jobs', jobName), 'diagnostic Job')
  const provenance = await artifact(root, path.join(directory, 'diagnostic-provenance.json'))
  if (provenance?.protocol !== 'harbor-diagnostic-provenance/v1' || provenance.operationId !== operation.operationId || provenance.promotionEligible !== false || !Array.isArray(provenance.selection) || provenance.selection.length < 1 || provenance.selection.length > 12) fail()
  const resultRef = { verified: true, jobName, ...(operation.target?.workspace ? { workspace: operation.target.workspace } : {}), partial: operation.status !== 'COMPLETED' }
  let lifecycle, observationWarning
  try {
    lifecycle = await artifact(root, path.join(directory, 'trial-lifecycle.json'))
    if (lifecycle.schema_version !== 1 || lifecycle.job !== jobName || lifecycle.dataset_total !== provenance.selection.length || !Array.isArray(lifecycle.trials) || lifecycle.trials.length !== provenance.selection.length || lifecycle.trials.some(trial => !phases.has(trial.phase) || typeof trial.terminal !== 'boolean' || !Number.isSafeInteger(trial.dataset_order) || trial.dataset_order < 0 || trial.dataset_order >= provenance.selection.length) || new Set(lifecycle.trials.map(trial => trial.dataset_order)).size !== provenance.selection.length) fail()
  } catch (cause) {
    if (cause.code !== 'ENOENT' && !tolerateLifecycleError) throw cause
    lifecycle = undefined
    if (cause.code !== 'ENOENT') observationWarning = 'HARBOR_DIAGNOSTIC_OBSERVATION_UNSAFE'
  }
  return { resultRef, lifecycle, total: provenance.selection.length, ...(observationWarning ? { observationWarning } : {}) }
}

/** Bounded local artifact reads only. Missing evidence is not manufactured progress. */
export async function observeDiagnostic(config, operation, { root }) {
  try {
    const { resultRef, lifecycle, total, observationWarning } = await evidence(config, operation, root, { tolerateLifecycleError: true })
    if (!lifecycle) return { resultRef, ...(observationWarning ? { observationWarning } : {}) }
    const counts = {}
    for (const trial of lifecycle.trials) counts[trial.phase] = (counts[trial.phase] ?? 0) + 1
    return { resultRef, progress: { source: 'harbor-lifecycle', total, completed: lifecycle.trials.filter(trial => trial.terminal).length, counts, ...(typeof lifecycle.updated_at === 'string' && Number.isFinite(Date.parse(lifecycle.updated_at)) ? { updatedAt: lifecycle.updated_at } : {}) } }
  } catch (cause) {
    return cause.code === 'ENOENT' ? {} : { observationWarning: 'HARBOR_DIAGNOSTIC_OBSERVATION_UNSAFE' }
  }
}

function probeGroup(pid) {
  try { process.kill(-pid, 0); return 'running' }
  catch (cause) { if (cause.code !== 'ESRCH') return 'unknown' }
  // A reused live PID is deliberately a blocker, never a process to signal.
  try { process.kill(pid, 0); return 'running' }
  catch (cause) { return cause.code === 'ESRCH' ? 'stopped' : 'unknown' }
}

const composeName = name => {
  const lowered = name.toLowerCase()
  return (/^[a-z0-9]/.test(lowered) ? lowered : `0${lowered}`).replace(/[^a-z0-9_-]/g, '-')
}

/** Read-only reconciliation. It does not kill processes or remove Docker resources. */
export async function inspectDiagnostic(config, operation, { root, runProcess, processProbe = probeGroup, platform = process.platform }) {
  const blockers = []
  const checkpoint = operation.events?.find(event => event.result?.process)?.result.process
  let processState = 'unknown'
  let runtimeMatches = false
  let environment
  if (/^sha256:[a-f0-9]{64}$/.test(checkpoint?.hostIdentity ?? '') && /^sha256:[a-f0-9]{64}$/.test(checkpoint?.dockerIdentity ?? '') && checkpoint.platform === platform && checkpoint.dockerTransport === 'pinned-local-unix/v1') {
    try {
      environment = await pinDiagnosticEnvironment(runProcess, process.env)
      const current = await readDiagnosticRuntimeIdentity({ runProcess, platform, env: environment })
      runtimeMatches = current.hostIdentity === checkpoint.hostIdentity && current.dockerIdentity === checkpoint.dockerIdentity
    } catch {}
  }
  if (!runtimeMatches) blockers.push({ code: 'DIAGNOSTIC_RUNTIME_IDENTITY_UNVERIFIED', message: 'The recorded Host machine and Docker daemon cannot be matched. Restore the original runtime/context and inspect again; a different empty daemon is not proof of cleanup.' })
  if (runtimeMatches && Number.isSafeInteger(checkpoint?.pid) && checkpoint.pid > 1 && checkpoint.groupId === checkpoint.pid && ['darwin', 'linux'].includes(checkpoint.platform)) {
    try { processState = await processProbe(checkpoint.pid) } catch {}
    if (!['stopped', 'running', 'unknown'].includes(processState)) processState = 'unknown'
  }
  const processInfo = { state: processState, ...(checkpoint?.pid ? { pid: checkpoint.pid, groupId: checkpoint.groupId } : {}) }
  if (processState !== 'stopped') blockers.push({ code: processState === 'running' ? 'DIAGNOSTIC_PROCESS_PRESENT' : 'DIAGNOSTIC_PROCESS_OWNERSHIP_UNKNOWN', message: processState === 'running' ? 'The recorded process or process group still exists. Stop the original Host-owned run and inspect again; no signal was sent.' : 'A trustworthy stopped-process checkpoint is unavailable. An administrator must reconcile the original runner; no resources or lock were changed.' })
  let resources = { state: 'unknown', items: [] }, resultRef
  try {
    const value = await evidence(config, operation, root)
    resultRef = value.resultRef
    if (!runtimeMatches) fail()
    if (!value.lifecycle) fail()
    const names = value.lifecycle.trials.map(trial => trial.trial_name).filter(Boolean)
    // A separate-verifier name is truncated to 63 characters by Harbor. For
    // longer Trial names that can truncate the ownership prefix itself, so
    // refuse to infer cleanup instead of missing those resources.
    if (names.some(name => typeof name !== 'string' || !/^[A-Za-z0-9_.-]{1,50}$/.test(name)) || value.lifecycle.trials.some(trial => trial.phase !== 'queued' && !trial.trial_name)) fail()
    // Harbor 0.21's POSIX Docker adapter binds every environment and separate
    // verifier project to `<trial_name>__…`. Trial-start is journaled before
    // environment launch. We read labels only, never environment variables.
    const prefixes = names.map(name => `${composeName(name)}__`)
    const items = []
    for (const kind of ['container', 'network', 'volume']) {
      const args = [kind, 'ls', ...(kind === 'container' ? ['--all'] : []), '--filter', 'label=com.docker.compose.project', '--format', '{{.ID}}\t{{.Label "com.docker.compose.project"}}']
      if (kind === 'volume') args[args.length - 1] = '{{.Name}}\t{{.Label "com.docker.compose.project"}}'
      const response = await runProcess('docker', args, { cwd: root, env: environment, timeoutMs: 10_000, maxOutputBytes: 128 * 1024 })
      if (response.code !== 0 || typeof response.stdout !== 'string') fail()
      for (const line of response.stdout.split('\n').filter(Boolean)) {
        const [id, project, extra] = line.split('\t')
        if (extra !== undefined || !/^[a-zA-Z0-9_.-]{1,200}$/.test(id ?? '') || !/^[a-z0-9_-]{1,220}$/.test(project ?? '')) fail()
        if (prefixes.some(prefix => project.startsWith(prefix))) items.push({ kind, id, project })
      }
    }
    const finalIdentity = await readDiagnosticRuntimeIdentity({ runProcess, platform, env: environment })
    if (finalIdentity.hostIdentity !== checkpoint.hostIdentity || finalIdentity.dockerIdentity !== checkpoint.dockerIdentity) fail()
    resources = { state: items.length ? 'remaining' : 'clean', items: items.sort((a, b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`)), checkedProjects: prefixes, boundary: 'Owned Compose containers, networks and volumes only; shared image/build caches are retained.' }
    if (items.length) blockers.push({ code: 'DIAGNOSTIC_RESOURCES_REMAIN', message: 'The listed Compose resources remain. Have the workspace administrator inspect these exact resources, then check again. This action never deletes resources.' })
  } catch {
    blockers.push({ code: 'DIAGNOSTIC_RESOURCES_UNKNOWN', message: 'Job provenance/lifecycle or Docker inspection is unavailable. Restore access and inspect again; an empty or unreadable response is not proof of cleanup.' })
  }
  return { process: processInfo, resources, ...(resultRef ? { resultRef } : {}), blockers, canRecover: processState === 'stopped' && resources.state === 'clean' }
}
