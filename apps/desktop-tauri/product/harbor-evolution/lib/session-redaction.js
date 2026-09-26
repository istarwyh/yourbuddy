import { canonicalDigest } from './session-selection.js'
import {
  containsCredentialText,
  containsOpaqueSecretText,
  redactCredentialTextWithCount,
  redactOpaqueSecretTextWithCount,
} from './credential-redaction.js'

const MAX_MESSAGE_CHARS = 4_000
const MAX_TRANSCRIPT_MESSAGES = 80
const MAX_OBSERVATION_BYTES = 512 * 1024
const MAX_EVIDENCE_SUMMARY_BYTES = 4 * 1024
const MAX_EVIDENCE_SOURCE_CHARS = 32_000

function replaceCanaries(value, canaries) {
  let text = value
  let replacements = 0
  for (const canary of canaries) {
    if (!canary || !text.includes(canary)) continue
    const pieces = text.split(canary)
    replacements += pieces.length - 1
    text = pieces.join('[REDACTED_SESSION_ID]')
  }
  return { text, replacements }
}

function replaceSecrets(value, canaries = []) {
  const canaryResult = replaceCanaries(value, canaries)
  const credentials = redactCredentialTextWithCount(canaryResult.text, '[REDACTED_SECRET]', false)
  const opaque = redactOpaqueSecretTextWithCount(credentials.text, '[REDACTED_SECRET]')
  return {
    text: opaque.text,
    replacements: canaryResult.replacements + credentials.replacements + opaque.replacements,
  }
}

function sanitizeText(value, maxChars = MAX_MESSAGE_CHARS, canaries = []) {
  const input = String(value ?? '')
  const redacted = replaceSecrets(input, canaries)
  const truncated = redacted.text.length > maxChars
  return {
    text: truncated ? `${redacted.text.slice(0, maxChars)}\n[TRUNCATED]` : redacted.text,
    replacements: redacted.replacements,
    truncated,
  }
}

function isoTime(value) {
  return Number.isSafeInteger(value) && value > 0 ? new Date(value).toISOString() : null
}

function appendOrigin(event) {
  return event?.surfaceOp === undefined || event.surfaceOp === 'append'
}

function visibleContent(message, report, canaries) {
  const content = []
  for (const block of Array.isArray(message?.content) ? message.content : []) {
    if (block?.type !== 'text' || typeof block.text !== 'string') continue
    const sanitized = sanitizeText(block.text, MAX_MESSAGE_CHARS, canaries)
    report.replacements += sanitized.replacements
    if (sanitized.truncated) report.truncations += 1
    if (sanitized.text.trim()) content.push({ type: 'text', text: sanitized.text })
  }
  return content
}

function messageRef(message) {
  return canonicalDigest(
    { id: typeof message?.id === 'string' ? message.id : null },
    'harbor-dsh-session-message-ref-v1',
  )
}

function sanitizeIdentity(value, report, canaries) {
  const sanitized = sanitizeText(value, 160, canaries)
  report.replacements += sanitized.replacements
  if (sanitized.truncated) report.truncations += 1
  return sanitized.text
}

function modelSegments(selected, report, canaries) {
  return selected.index.modelSegments.map(segment => ({
    from_seq: segment.from_seq,
    through_seq: segment.through_seq,
    provider: sanitizeIdentity(segment.provider, report, canaries),
    model: sanitizeIdentity(segment.model, report, canaries),
    ...(segment.reasoning_effort
      ? { reasoning_effort: sanitizeIdentity(segment.reasoning_effort, report, canaries) }
      : {}),
  }))
}

function boundedResultText(result) {
  const parts = []
  const append = value => {
    if (typeof value === 'string' && value) parts.push(value)
  }
  append(result?.data?.error?.message)
  for (const block of result?.data?.message?.content ?? []) {
    append(block?.text)
    for (const nested of block?.content ?? []) append(nested?.text)
  }
  const text = parts.join('\n')
  return { text: text.slice(0, MAX_EVIDENCE_SOURCE_CHARS), truncated: text.length > MAX_EVIDENCE_SOURCE_CHARS }
}

function integer(value) {
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined
}

function resultExitCode(result, text) {
  const direct = integer(result?.data?.exitCode ?? result?.data?.exit_code ?? result?.data?.code)
  if (direct !== undefined) return direct
  const match = text.match(/\[exit code:\s*(-?\d+)\]|(?:exit(?:ed)?(?:\s+with)?(?:\s+code)?[:= ]+)\s*(-?\d+)/i)
  if (!match) return undefined
  const parsed = Number(match[1] ?? match[2])
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

function evidenceCategory(tool, invocation) {
  const source = `${tool} ${invocation}`.toLowerCase()
  if (/\b(?:test|pytest|vitest|jest|node --test)\b/.test(source)) return 'test'
  if (/\bgit\b/.test(source)) return 'git'
  if (/\b(?:build|compile|pack)\b/.test(source)) return 'build'
  if (/\b(?:write|edit|patch)\b/.test(source)) return 'file-write'
  if (/\b(?:http|fetch|curl|request)\b/.test(source)) return 'http'
  return 'unknown'
}

function allowlistedFacts(category, text, outcome) {
  const facts = []
  if (category === 'test') {
    let passed
    let failed
    for (const pattern of [/(\d+)\s+passed\b/i, /#\s*pass\s+(\d+)\b/i]) {
      const match = text.match(pattern)
      if (match) { passed = integer(match[1]); break }
    }
    for (const pattern of [/(\d+)\s+failed\b/i, /#\s*fail\s+(\d+)\b/i]) {
      const match = text.match(pattern)
      if (match) { failed = integer(match[1]); break }
    }
    if (passed !== undefined || failed !== undefined) facts.push({ kind: 'test-count', passed: passed ?? 0, failed: failed ?? 0 })
  } else if (category === 'git') {
    const changed = integer(text.match(/(\d+)\s+files? changed/i)?.[1])
    const insertions = integer(text.match(/(\d+)\s+insertions?/i)?.[1])
    const deletions = integer(text.match(/(\d+)\s+deletions?/i)?.[1])
    if (changed !== undefined || insertions !== undefined || deletions !== undefined) {
      facts.push({ kind: 'git-change-count', files_changed: changed ?? 0, insertions: insertions ?? 0, deletions: deletions ?? 0 })
    }
  } else if (category === 'file-write') {
    facts.push({ kind: 'file-change', count: 1 })
  } else if (category === 'http') {
    const status = integer(text.match(/\bHTTP\/[0-9.]+\s+(\d{3})\b/i)?.[1] ?? text.match(/\bstatus(?: code)?[:= ]+(\d{3})\b/i)?.[1])
    if (status !== undefined) facts.push({ kind: 'http-status', status })
  } else if (category === 'build') {
    facts.push({ kind: 'build-status', status: outcome })
  }
  return facts.slice(0, 4)
}

function artifactReferences(result) {
  const values = Array.isArray(result?.data?.artifacts) ? result.data.artifacts : []
  return values.slice(0, 5).map((value, index) => canonicalDigest(
    { index, value },
    'harbor-dsh-session-artifact-ref-v1',
  ))
}

function toolEvidence(events, report, canaries) {
  const results = new Map()
  for (const event of events) {
    if (event?.type !== 'tool/result') continue
    results.set(event.data?.message?.source?.callId, event)
  }
  const tools = []
  const evidenceSummaries = []
  const totalCalls = events.filter(event => event?.type === 'tool/call').length
  for (const event of events) {
    if (event?.type !== 'tool/call' || tools.length >= 200) continue
    const result = results.get(event.data?.callId)
    const safeName = sanitizeIdentity(event.data?.name ?? 'unknown', report, canaries)
    const raw = boundedResultText(result)
    const sanitized = replaceSecrets(raw.text, canaries)
    report.replacements += sanitized.replacements
    const exitCode = resultExitCode(result, sanitized.text)
    const failed = Boolean(result?.data?.error || result?.data?.message?.content?.[0]?.isError || (exitCode !== undefined && exitCode !== 0))
    const outcome = !result ? 'unknown' : failed ? 'failed' : 'succeeded'
    const invocation = JSON.stringify(event.data?.input ?? event.data?.arguments ?? {}).slice(0, 2_000)
    const category = evidenceCategory(safeName, invocation)
    const callRef = canonicalDigest({ call_id: event.data?.callId ?? null }, 'harbor-dsh-session-tool-call-ref-v1')
    const durationMs = Number.isSafeInteger(result?.time) && Number.isSafeInteger(event.time)
      ? Math.max(0, result.time - event.time)
      : null
    tools.push({
      event_seq: event.seq,
      name: safeName,
      outcome: outcome === 'failed' ? 'error' : outcome === 'succeeded' ? 'success' : 'unknown',
      error_code: typeof result?.data?.error?.code === 'string'
        ? sanitizeIdentity(result.data.error.code, report, canaries)
        : null,
      result_summary: result ? 'Deterministic bounded evidence summary available.' : 'No matching tool result observed.',
      truncated: raw.truncated,
    })
    const summary = {
      call_ref: callRef,
      tool: safeName,
      category,
      outcome,
      ...(exitCode === undefined ? {} : { exit_code: exitCode }),
      ...(durationMs === null ? {} : { duration_ms: durationMs }),
      facts: allowlistedFacts(category, sanitized.text, outcome),
      artifact_refs: artifactReferences(result),
      result_digest: canonicalDigest(result?.data ?? null, 'harbor-dsh-session-tool-result-v1'),
      redaction: { replacements: sanitized.replacements, truncated: raw.truncated },
    }
    if (Buffer.byteLength(JSON.stringify(summary)) > MAX_EVIDENCE_SUMMARY_BYTES) {
      summary.facts = []
      summary.artifact_refs = []
      summary.redaction.truncated = true
    }
    assertNoSecret(summary, canaries)
    evidenceSummaries.push(summary)
  }
  return { tools, evidenceSummaries, omittedCalls: Math.max(0, totalCalls - tools.length) }
}

function turnEvidence(events) {
  const starts = new Map()
  const turns = []
  for (const event of events) {
    if (event?.type === 'turn/start') starts.set(event.data?.turn, event.time)
    if (event?.type === 'turn/end') {
      turns.push({
        turn: event.data?.turn,
        reason: event.data?.reason?.kind ?? 'unknown',
        started_at: isoTime(starts.get(event.data?.turn)),
        ended_at: isoTime(event.time),
      })
    }
  }
  return turns
}

function usageEvidence(events) {
  let inputTokens = 0
  let outputTokens = 0
  let reported = false
  for (const event of events) {
    if (event?.type !== 'assistant/message' || !event.data?.usage) continue
    const usage = event.data.usage
    if (Number.isFinite(usage.inputTokens)) inputTokens += usage.inputTokens
    if (Number.isFinite(usage.outputTokens)) outputTokens += usage.outputTokens
    reported = true
  }
  return { input_tokens: inputTokens, output_tokens: outputTokens, reported }
}

function sanitizeFeedback(items, report, canaries) {
  const output = []
  for (const item of Array.isArray(items) ? items : []) {
    if (!['positive', 'negative'].includes(item?.rating)) continue
    const note = sanitizeText(item.note ?? '', 1_000, canaries)
    report.replacements += note.replacements
    if (note.truncated) report.truncations += 1
    output.push({
      message_ref: canonicalDigest({ id: item.messageId ?? null }, 'harbor-dsh-feedback-message-ref-v1'),
      rating: item.rating,
      ...(note.text.trim() ? { note: note.text } : {}),
      updated_at: isoTime(item.updatedAt),
    })
  }
  return output.slice(0, 100)
}

function assertNoSecret(value, canaries = []) {
  const serialized = JSON.stringify(value)
  for (const canary of canaries) {
    if (canary.length >= 8 && serialized.includes(canary)) {
      throw new Error('SESSION_REDACTION_FAILED: a raw Session id survived the redaction pipeline')
    }
  }
  if (containsCredentialText(serialized) || containsOpaqueSecretText(serialized)) {
    throw new Error('SESSION_REDACTION_FAILED: a credential-shaped value survived the redaction pipeline')
  }
  if (Buffer.byteLength(serialized) > MAX_OBSERVATION_BYTES) {
    throw new Error(`SESSION_OBSERVATION_TOO_LARGE: redacted observation exceeds ${MAX_OBSERVATION_BYTES} bytes`)
  }
}

const policyWithoutDigest = {
  id: 'dsh-session-default-redaction',
  version: '2.0.0',
  projection: 'direct-human-and-assembled-assistant-text-with-deterministic-evidence',
  visible_text: 'preserve-except-credentials-and-session-identifiers',
  local_paths: 'preserve',
  tool_payloads: 'deterministic-allowlist-summary',
  reasoning: 'omit',
  attachments: 'omit',
  credentials: 'redact-and-fail-closed',
}

export const DEFAULT_REDACTION_POLICY = Object.freeze({
  ...policyWithoutDigest,
  digest: canonicalDigest(policyWithoutDigest, 'harbor-dsh-session-redaction-policy-v2'),
})

export function buildSessionObservation(selected, feedbackItems = []) {
  const report = { replacements: 0, truncations: 0, omitted_blocks: 0 }
  const canaries = [String(selected.rawSessionId ?? '')].filter(Boolean)
  const visibleTranscript = []
  for (const event of selected.events) {
    if (!appendOrigin(event)) continue
    let role
    let message
    if (event?.type === 'user/message' && event.data?.source?.kind === 'user') {
      role = 'user'
      message = event.data
    } else if (event?.type === 'assistant/message') {
      role = 'assistant'
      message = event.data?.message
    } else {
      continue
    }
    const content = visibleContent(message, report, canaries)
    const originalBlocks = Array.isArray(message?.content) ? message.content.length : 0
    report.omitted_blocks += Math.max(0, originalBlocks - content.length)
    if (!content.length) continue
    if (visibleTranscript.length >= MAX_TRANSCRIPT_MESSAGES) {
      report.truncations += 1
      break
    }
    visibleTranscript.push({
      event_seq: event.seq,
      message_ref: messageRef(message),
      role,
      content,
      time: isoTime(event.time),
    })
  }
  const initialGoal = visibleTranscript.find(message => message.role === 'user')?.content
    ?.map(block => block.text).join('\n') ?? ''
  const sanitizedTitle = sanitizeText(
    initialGoal.split('\n').find(Boolean) ?? 'Historical DSH Session',
    120,
    canaries,
  )
  report.replacements += sanitizedTitle.replacements
  if (sanitizedTitle.truncated) report.truncations += 1

  const agentPreset = selected.index.effectiveAgentPreset ?? selected.header.agentPreset
  const executionEvidence = toolEvidence(selected.events, report, canaries)
  if (executionEvidence.omittedCalls) report.truncations += 1
  const feedback = sanitizeFeedback(feedbackItems, report, canaries)
  const observation = {
    schema_version: 2,
    protocol: 'dsh-session-observation/v2',
    record_kind: 'dsh-session',
    execution_mode: 'observe-existing',
    trial_id: selected.trialId,
    source: {
      ref: selected.sourceRef,
      captured_through_seq: selected.capturedThroughSeq,
      source_digest: selected.sourceDigest,
      created_at: isoTime(selected.header.createdAt),
      last_activity_at: isoTime(selected.index.lastActivityAt),
      last_turn_reason: selected.index.lastTurnReason,
      session_format_version: selected.header.version,
    },
    generator: {
      agent_preset: agentPreset
        ? sanitizeIdentity(agentPreset, report, canaries)
        : null,
      model_segments: modelSegments(selected, report, canaries),
    },
    task: {
      title: sanitizedTitle.text || 'Historical DSH Session',
      initial_user_goal: initialGoal,
      turn_count: selected.index.turnCount,
    },
    visible_transcript: visibleTranscript,
    execution: {
      tools: executionEvidence.tools,
      evidence_summaries: executionEvidence.evidenceSummaries,
      turns: turnEvidence(selected.events),
      usage: usageEvidence(selected.events),
    },
    evidence_coverage: {
      transcript: visibleTranscript.length < MAX_TRANSCRIPT_MESSAGES ? 'complete' : 'partial',
      tool_outcomes: executionEvidence.evidenceSummaries.length === 0
        ? 'omitted'
        : executionEvidence.omittedCalls === 0 && executionEvidence.evidenceSummaries.every(item => item.outcome !== 'unknown') ? 'complete' : 'partial',
      artifacts: executionEvidence.evidenceSummaries.some(item => item.artifact_refs.length) ? 'partial' : 'omitted',
      feedback: feedback.length ? 'available' : 'omitted',
    },
    feedback: { items: feedback },
    completeness: {
      transcript_complete: visibleTranscript.length < MAX_TRANSCRIPT_MESSAGES,
      tool_payloads_complete: executionEvidence.evidenceSummaries.length > 0
        && executionEvidence.omittedCalls === 0
        && executionEvidence.evidenceSummaries.every(item => item.outcome !== 'unknown'),
      attachments_complete: false,
      truncations: [
        ...(report.truncations ? [`${report.truncations} bounded projection(s)`] : []),
        ...(executionEvidence.omittedCalls ? [`${executionEvidence.omittedCalls} tool call(s) omitted after the 200-call evidence limit`] : []),
      ],
    },
    redaction: report,
  }
  observation.digest = canonicalDigest(observation, 'harbor-dsh-session-observation-v2')
  assertNoSecret(observation, canaries)
  return observation
}

export function scanForCredentialCanaries(value) {
  try {
    assertNoSecret(value)
    return []
  } catch (error) {
    return [error.message]
  }
}
