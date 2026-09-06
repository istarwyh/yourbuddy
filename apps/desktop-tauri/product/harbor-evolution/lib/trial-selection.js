import { randomBytes } from 'node:crypto'
import { localObjectDigest } from './interaction-objects.js'

export const MAX_SELECTED_TRIALS = 1000

/** Server-owned, frozen IDs/revisions; a query can never silently expand later. */
export class TrialSelectionRegistry {
  constructor({ now = Date.now, ttlMs = 15 * 60_000, maxEntries = 256 } = {}) {
    this.now = now
    this.ttlMs = ttlMs
    this.maxEntries = maxEntries
    this.entries = new Map()
  }
  issue({ sessionId, projectRoot, workspace, job, mode, filters, trials }) {
    for (const [id, entry] of this.entries) if (entry.expiresAtMs <= this.now()) this.entries.delete(id)
    if (!['explicit', 'query-snapshot'].includes(mode) || !trials?.length || trials.length > MAX_SELECTED_TRIALS) throw new Error('HARBOR_SELECTION_INVALID: Select 1–1000 Trials.')
    if (this.entries.size >= this.maxEntries) throw new Error('HARBOR_SELECTION_LIMIT: Too many selections; wait for old selections to expire.')
    const members = trials.map(trial => ({ id: trial.id, revision: localObjectDigest(trial) }))
    if (new Set(members.map(item => item.id)).size !== members.length || members.some(item => !item.id)) throw new Error('HARBOR_SELECTION_INVALID: Trial identities must be unique.')
    const filterDigest = localObjectDigest(filters ?? {})
    const sourceDigest = localObjectDigest({ mode, filterDigest, members })
    const id = `hsel_${randomBytes(18).toString('base64url')}`
    const ref = { kind: 'trial-set', id, job, stage: 'judge', sourceDigest, selectionCount: members.length }
    const entry = { ref, sessionId: String(sessionId), projectRoot, workspace, job, mode, filterDigest, members, expiresAtMs: this.now() + this.ttlMs }
    this.entries.set(id, structuredClone(entry))
    return { ref, count: members.length, mode, filterDigest, expiresAt: new Date(entry.expiresAtMs).toISOString() }
  }
  owned(ref, owner) {
    const entry = this.entries.get(ref.id)
    if (!entry || entry.expiresAtMs <= this.now()) throw new Error('HARBOR_SELECTION_EXPIRED: Select the Trial set again.')
    if (entry.sessionId !== String(owner.sessionId) || entry.projectRoot !== owner.projectRoot || entry.workspace !== owner.workspace || entry.job !== ref.job || entry.ref.sourceDigest !== ref.sourceDigest || entry.ref.selectionCount !== ref.selectionCount) throw new Error('HARBOR_SELECTION_DENIED: Selection does not belong to this Session and Job.')
    return entry
  }
  memberIds(ref, owner) {
    return this.owned(ref, owner).members.map(member => member.id)
  }
  resolve(ref, owner, currentTrials) {
    const entry = this.owned(ref, owner)
    const byId = new Map(currentTrials.map(trial => [trial.id, trial]))
    for (const member of entry.members) {
      const current = byId.get(member.id)
      if (!current || localObjectDigest(current) !== member.revision) throw new Error('HARBOR_CONTEXT_STALE_SELECTION: Selected Trials changed. Reselect before continuing.')
    }
    return { ref: { ...entry.ref }, value: { mode: entry.mode, filterDigest: entry.filterDigest, count: entry.members.length, members: entry.members, trials: entry.members.map(member => byId.get(member.id)) } }
  }
}
