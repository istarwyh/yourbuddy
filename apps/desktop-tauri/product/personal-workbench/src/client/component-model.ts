/** Desktop-owned component inventory, installation plans, and local metric responses. */

/** One current-release component; preparation and activation are distinct states. */
export interface ComponentView {
  readonly key: string
  readonly kind: 'core-runtime' | 'runtime-fallback' | 'capability-on-demand' | 'optional'
  readonly version: string
  readonly purpose: string
  readonly archiveBytes: number
  readonly installedBytes: number | null
  readonly state: 'absent' | 'prepared' | 'active' | 'in-use' | 'installing' | 'failed'
  readonly policy: 'required' | 'fallback' | 'on-demand' | 'manual'
  readonly canInstall: boolean
  readonly canChangePolicy: boolean
  readonly canClean: boolean
  readonly error: string | null
  /** Native token for this Host generation and exact component installation attempt. */
  readonly runtimeToken: string | null
}

/** Dependency-first preparation steps returned by the native component planner. */
export interface InstallPlan {
  readonly components: readonly {
    readonly component: string
    readonly id: string
    readonly action: 'prepare' | 'reuse'
    readonly archiveBytes: number
  }[]
  /** Archive sum requiring preparation, not a network transfer estimate or limit. */
  readonly prepareArchiveBytes: number
}

/** Device-local counters; retransferred bytes are already included in network bytes. */
export interface ComponentCounters {
  readonly networkBytes: number
  readonly retransferredBytes: number
  readonly cacheArchiveBytes: number
  readonly offlineSeedArchiveBytes: number
  readonly resumeAttempts: number
  readonly resumeSuccesses: number
  readonly installs: number
  readonly invocations: number
  readonly successfulInvocations: number
}

/** Native aggregate for this device, release, and accumulation window. */
export interface MetricsSnapshot {
  readonly formatVersion: number
  readonly appVersion: string
  readonly windowStartedAtUnixMs: number
  readonly bootAttempts: number
  readonly workbenchReadyCount: number
  readonly workbenchReadyTotalMs: number
  readonly workbenchReadyMaxMs: number
  readonly readinessFailures: number
  readonly components: Readonly<Record<string, ComponentCounters>>
}

/** Independent inventory and metric results; a metric failure does not block installation. */
export interface ComponentOverview {
  readonly appVersion: string
  readonly components: readonly ComponentView[]
  readonly metrics: MetricsSnapshot | null
  readonly metricsError: string | null
}

/** Native operations supplied by the desktop integration; rendering never accesses files. */
export interface ComponentController {
  /** Read current inventory and the local metrics window. */
  load(): Promise<ComponentOverview>
  /** Read a dependency-first plan without preparing or activating any component. */
  plan(key: string): Promise<InstallPlan>
  /** Prepare a reviewed component and report whether application restart is required. */
  install(key: string): Promise<{ readonly restartRequired: boolean }>
}
