/**
 * Pure derivations for the Subagent page's background-job section. Kept
 * framework-free so the node test environment can unit-test them: the job
 * rows are collected from the per-session lists the client reads through the
 * plugin's `jobs.list` route (DSH 0.1.7 dropped the harness `session/jobs`
 * push mirror that used to feed `jobsBySession`, and the registry's access
 * fence admits a job only to its OWNER session — so the caller fans one read
 * out per tree session). Nothing here issues requests, and the row ordering /
 * status mapping mirror the official ui-jobs header list.
 */
import type {
  SidebarSessionList,
  SidebarJobStatus,
  SidebarJobView,
} from '../context-types.ts'
import type { CopyKey } from './locales.ts'
import { treeSessionIds } from './subagent-lineage.ts'

/** One row of the jobs section: the job plus its owning session's title. */
export interface TreeJob {
  ownerSessionId: string
  ownerTitle: string
  job: SidebarJobView
}

/** Whether the registry still holds the job open (its duration ticks). */
export function isJobLive(job: SidebarJobView): boolean {
  return job.status === 'running' || job.status === 'stopping'
}

// The lineage walk itself lives in ./subagent-lineage.ts (the single shared
// subagent-origin chain implementation); re-exported for the established
// import sites of this module.
export { treeSessionIds }

/**
 * Whether a NEW background job appeared for the current session between two
 * consecutive reads of its job list (a job id the previous list lacked).
 * Unlike the subagent auto-open (0 → N only), ANY new job id triggers: the
 * agent may start several jobs over a session, and each new one should
 * surface the Tasks page containing the background-jobs section. A fresh page
 * load never triggers — the caller builds its baseline from the first list it
 * reads instead of comparing against one (see the poller in
 * sidebar/use-host-feeds.ts).
 */
export function detectNewJob(
  prev: readonly SidebarJobView[],
  next: readonly SidebarJobView[],
): boolean {
  const prevIds = new Set(prev.map(job => job.id))
  return next.some(job => !prevIds.has(job.id))
}

/**
 * Collect the background jobs of the whole current tree, owner-labeled. The
 * map is keyed by the OWNER session (the fence's unit of access): sessions the
 * caller could not read, or that returned nothing, contribute nothing — an
 * absent entry is an empty set, never a dropped row of another tree.
 */
export function collectTreeJobs(
  byId: SidebarSessionList['byId'],
  jobsBySession: Readonly<Record<string, readonly SidebarJobView[]>> | undefined,
  rootId: string | undefined,
): TreeJob[] {
  const rows: TreeJob[] = []
  if (jobsBySession === undefined) return rows
  for (const sessionId of treeSessionIds(byId, rootId)) {
    const jobs = jobsBySession[sessionId]
    if (jobs === undefined || jobs.length === 0) continue
    const ownerTitle = byId[sessionId]?.displayTitle ?? sessionId
    for (const job of jobs) rows.push({ ownerSessionId: sessionId, ownerTitle, job })
  }
  return rows
}

/**
 * Live rows first in start order, then settled rows newest-first (mirror of
 * the official ui-jobs ordering); a tie falls back to start order so the
 * sort never depends on the host's map iteration.
 */
export function orderJobs(rows: readonly TreeJob[]): TreeJob[] {
  return [...rows].sort((left, right) => {
    const liveLeft = isJobLive(left.job)
    if (liveLeft !== isJobLive(right.job)) return liveLeft ? -1 : 1
    if (liveLeft) return left.job.startedAt - right.job.startedAt
    const finished = (right.job.finishedAt ?? right.job.startedAt) - (left.job.finishedAt ?? left.job.startedAt)
    return finished !== 0 ? finished : left.job.startedAt - right.job.startedAt
  })
}

/** The sidebar's StateDot states for the five wire statuses. */
export type JobDotState = 'ongoing' | 'warning' | 'done' | 'error'

/**
 * Status marker semantics. `stopping` and `killed` share the attention
 * color: both mean the work ended (or is ending) on request rather than on
 * its own.
 */
export function jobDotState(status: SidebarJobStatus): JobDotState {
  switch (status) {
    case 'running': return 'ongoing'
    case 'stopping': return 'warning'
    case 'completed': return 'done'
    case 'killed': return 'warning'
    case 'failed': return 'error'
  }
}

/** Human status word of one wire status (localized through the passed translator). */
export function jobStatusLabel(
  status: SidebarJobStatus,
  t: (key: CopyKey, params?: Record<string, string | number>) => string,
): string {
  switch (status) {
    case 'running': return t('jobStatusRunning')
    case 'stopping': return t('jobStatusStopping')
    case 'completed': return t('jobStatusCompleted')
    case 'killed': return t('jobStatusKilled')
    case 'failed': return t('jobStatusFailed')
  }
}

/**
 * Elapsed time in at most two adjacent units (mirror of the official
 * ui-jobs duration wording). A background job that outlives an hour is
 * already exceptional, so hours is the widest unit.
 */
export function formatJobDuration(
  elapsedMs: number,
  t: (key: CopyKey, params?: Record<string, string | number>) => string,
): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1_000))
  const seconds = total % 60
  const minutes = Math.floor(total / 60) % 60
  const hours = Math.floor(total / 3_600)
  if (hours > 0) return t('jobDurationHours', { hours, minutes })
  if (minutes > 0) return t('jobDurationMinutes', { minutes, seconds })
  return t('jobDurationSeconds', { seconds })
}
