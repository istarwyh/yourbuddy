/** Poll native startup state so late or reloaded splash documents retain progress and failures. */
window.DSH_SPLASH_STATE = {
  start({ invoke, render, onError, schedule = setTimeout, cancel = clearTimeout }) {
    let stopped = false
    let timer
    let retryPending = false
    let latest
    async function poll() {
      try {
        const snapshot = await invoke('run_first_party_command', { command: 'get_boot_status' })
        if (!stopped) {
          latest = snapshot
          render(retryPending ? { ...snapshot, retryRequested: true } : snapshot)
        }
      }
      catch (error) {
        if (!stopped) onError(String(error))
      }
      if (!stopped) timer = schedule(poll, 250)
    }
    void poll()
    return {
      async retry() {
        if (stopped || retryPending || !latest?.error || latest.retryRequested) return
        retryPending = true
        render({ ...latest, retryRequested: true })
        try {
          await invoke('run_first_party_command', { command: 'retry_boot' })
        }
        catch (error) {
          retryPending = false
          if (!stopped) {
            render(latest)
            onError(String(error))
          }
        }
      },
      stop() {
        stopped = true
        if (timer !== undefined) cancel(timer)
      },
    }
  },
}
