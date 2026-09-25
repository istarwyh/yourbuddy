/**
 * Background-job routes of the /sidebar JSON API ('jobs.output' /
 * 'jobs.kill'). The job LIST needs no route: it arrives through the
 * harness's `session/jobs` push mirror (`jobsBySession` in the sessions
 * list feed). The routes:
 *
 * - 'jobs.output' — REPLAYS the output the MODEL has read so far for one
 *   job. The source is the owner session's own event log: `tool/call` rows
 *   of `job_output` name the job via `arguments.job_id`, and the paired
 *   `tool/result` rows carry the finalized content the model received.
 *   Because the session store's in-memory log can lag the live append feed
 *   after a host restart (the store session stays frozen at its
 *   rehydration boundary), the plugin ALSO mirrors job_output events from
 *   the live `session/event` feed and merges both sources (deduped by seq).
 *   This touches NO DSH source: the model's `job_output` cursor is never
 *   consumed, and the pane stays empty until the agent reads the job.
 * - 'jobs.kill' — the registry's stock `kill` (a pristine DSH API), fenced
 *   by the owning session id (the 0.1.7 registry compares `SessionId`, the
 *   0.1.6 one compared a live Agent). Absent registry → 503, mirroring the
 *   settings routes' optional-service downgrade.
 */
import type { Context, SidebarJobView } from './context-types.ts';
/** The background-job routes of the sidebar API. */
export interface SidebarJobsRoutes {
    /**
     * The caller-visible jobs of one session, read straight from the registry.
     *
     * DSH 0.1.7 stopped mirroring background jobs into the client session list
     * (`jobsBySession` is gone with no replacement), so the Tasks page reads
     * them here instead. This is also the more authoritative source: the mirror
     * was last-wins over push frames, while the registry is the state itself.
     */
    list(payload: unknown): {
        jobs: SidebarJobView[];
    };
    /** The output the model has read so far for one job (event replay, capped). */
    output(payload: unknown): {
        text: string;
        truncated: boolean;
        read: boolean;
    };
    /** Request cancellation of one job (live jobs flip to stopping). */
    kill(payload: unknown): {
        ok: true;
        outcome: 'requested' | 'already-finished';
    };
}
/**
 * Build the jobs routes bound to the plugin context. `list` reads the
 * registry's own projection, `output` merges the owner session's event log
 * with the live job_output mirror, and `kill` cancels through the registry.
 * Every route that needs the registry degrades to a 503 when the deployment
 * lacks it.
 * @param ctx - host plugin context.
 * @param outputLimit - response cap for one output replay in bytes; longer
 *   texts are sliced and flagged `truncated` (mirrors the fs.read cap).
 */
export declare function buildJobsApi(ctx: Context, outputLimit: number): SidebarJobsRoutes;
