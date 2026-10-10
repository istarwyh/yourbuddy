//! Replayable splash state; retry restarts a failed boot rather than entering it twice.

use std::sync::Mutex;

use serde::Serialize;

use super::components::ComponentProgress;
use super::ProvisionEvent;

/// Latest native startup state, also available after the splash finishes loading.
#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootSnapshot {
    pub status: Option<String>,
    pub progress: Option<u8>,
    pub component: Option<String>,
    pub phase: Option<String>,
    pub transferred: Option<u64>,
    pub total: Option<u64>,
    pub attempt: Option<usize>,
    pub max_attempts: Option<usize>,
    pub error: Option<String>,
    pub retry_requested: bool,
}

/// Application-owned state survives renderer reloads and serializes retry requests.
#[derive(Default)]
pub struct BootStatus(Mutex<BootSnapshot>);

impl BootStatus {
    /// Read the latest state without consuming progress or an error.
    pub fn snapshot(&self) -> Result<BootSnapshot, String> {
        self.0
            .lock()
            .map(|state| state.clone())
            .map_err(|error| error.to_string())
    }

    /// Record the existing provisioning events after component preparation.
    pub fn provision(&self, event: ProvisionEvent) {
        if let Ok(mut state) = self.0.lock() {
            match event {
                ProvisionEvent::Status(status) => {
                    state.status = Some(status);
                    state.component = None;
                    state.phase = None;
                    state.transferred = None;
                    state.total = None;
                    state.attempt = None;
                    state.max_attempts = None;
                }
                ProvisionEvent::Progress(progress) => state.progress = Some(progress),
            }
        }
    }

    /// Record component transfer and preparation stages for renderer replay.
    pub fn component(&self, event: ComponentProgress) {
        if let Ok(mut state) = self.0.lock() {
            state.status = None;
            let component = match &event {
                ComponentProgress::Download { component, .. }
                | ComponentProgress::Retry { component, .. }
                | ComponentProgress::Phase { component, .. } => component,
            };
            if state.component.as_ref() != Some(component) {
                state.transferred = None;
                state.total = None;
                state.attempt = None;
                state.max_attempts = None;
                state.progress = None;
            }
            match event {
                ComponentProgress::Download {
                    component,
                    transferred,
                    total,
                } => {
                    state.component = Some(component);
                    state.phase = Some("download".into());
                    state.transferred = Some(transferred);
                    state.total = Some(total);
                }
                ComponentProgress::Retry {
                    component,
                    attempt,
                    max_attempts,
                } => {
                    state.component = Some(component);
                    state.phase = Some("retry".into());
                    state.attempt = Some(attempt);
                    state.max_attempts = Some(max_attempts);
                }
                ComponentProgress::Phase { component, phase } => {
                    state.component = Some(component);
                    state.phase = Some(phase.into());
                }
            }
        }
    }

    /// Retain a terminal boot error until the process restarts.
    pub fn fail(&self, error: String) {
        if let Ok(mut state) = self.0.lock() {
            state.error = Some(error);
        }
    }

    /// Only a terminal boot failure may request one process restart.
    pub fn request_retry(&self) -> Result<bool, String> {
        let mut state = self.0.lock().map_err(|error| error.to_string())?;
        if state.error.is_none() || state.retry_requested {
            return Ok(false);
        }
        state.retry_requested = true;
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    #[test]
    fn late_reader_receives_download_and_terminal_failure() {
        let status = BootStatus::default();
        status.component(ComponentProgress::Download {
            component: "harness".into(),
            transferred: 42,
            total: 100,
        });
        status.fail("download interrupted".into());
        for _ in 0..2 {
            let snapshot = status.snapshot().unwrap();
            assert_eq!(snapshot.transferred, Some(42));
            assert_eq!(snapshot.error.as_deref(), Some("download interrupted"));
        }
    }

    #[test]
    fn switching_components_clears_previous_transfer_and_retry_details() {
        let status = BootStatus::default();
        status.component(ComponentProgress::Download {
            component: "harness".into(),
            transferred: 42,
            total: 100,
        });
        status.component(ComponentProgress::Retry {
            component: "harness".into(),
            attempt: 2,
            max_attempts: 3,
        });
        status.component(ComponentProgress::Phase {
            component: "node".into(),
            phase: "verify",
        });
        let snapshot = status.snapshot().unwrap();
        assert_eq!(snapshot.component.as_deref(), Some("node"));
        assert_eq!(snapshot.phase.as_deref(), Some("verify"));
        assert!(snapshot.transferred.is_none());
        assert!(snapshot.total.is_none());
        assert!(snapshot.attempt.is_none());
    }

    #[test]
    fn concurrent_retries_request_only_one_restart_after_failure() {
        let status = Arc::new(BootStatus::default());
        assert!(!status.request_retry().unwrap());
        status.fail("offline".into());
        let threads: Vec<_> = (0..8)
            .map(|_| {
                let status = Arc::clone(&status);
                std::thread::spawn(move || status.request_retry().unwrap())
            })
            .collect();
        assert_eq!(
            threads
                .into_iter()
                .map(|thread| thread.join().unwrap())
                .filter(|requested| *requested)
                .count(),
            1
        );
    }
}
