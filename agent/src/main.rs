mod api;
mod config;
mod error;
mod metrics;
mod models;
mod state;
mod websocket;

use crate::api::create_router;
use crate::config::AppConfig;
use crate::error::Result;
use crate::metrics::spawn_metrics_collector;
use crate::state::{create_initial_snapshot, MetricsState};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::signal;
use tracing::info;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();

    info!("Starting remote-btop-agent v{}", env!("CARGO_PKG_VERSION"));

    let config_path = std::env::args().nth(1).map(std::path::PathBuf::from);
    let config = AppConfig::load(config_path)?;

    let token = read_token_file(&config.auth.token_file)?;
    if token.is_empty() {
        return Err(crate::error::AgentError::InvalidConfig(
            "Authentication token is empty".to_string(),
        ));
    }

    let initial_snapshot = create_initial_snapshot();
    let state = Arc::new(MetricsState::new(initial_snapshot));

    let collector_state = state.clone();
    let interval_ms = config.monitoring.interval_ms;
    let process_limit = config.monitoring.process_limit;
    let docker_socket = config.docker.socket.clone();
    let gpu_enabled = config.gpu.enabled;
    let docker_enabled = config.docker.enabled;

    tokio::spawn(async move {
        spawn_metrics_collector(
            collector_state,
            interval_ms,
            process_limit,
            docker_socket,
            gpu_enabled,
            docker_enabled,
        )
        .await;
    });

    let app = create_router(state, token);

    let addr: SocketAddr = format!("{}:{}", config.server.host, config.server.port).parse()?;
    info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    info!("Server shutdown complete");
    Ok(())
}

fn read_token_file(path: &str) -> Result<String> {
    let content = std::fs::read_to_string(path).map_err(|e| {
        crate::error::AgentError::Config(::config::ConfigError::Message(format!(
            "Failed to read token file '{}': {}",
            path, e
        )))
    })?;
    Ok(content.trim().to_string())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            info!("Received Ctrl+C, shutting down...");
        }
        _ = terminate => {
            info!("Received SIGTERM, shutting down...");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_read_token_file() {
        let mut temp_file = NamedTempFile::new().unwrap();
        write!(temp_file, "test-token-123").unwrap();
        let token = read_token_file(temp_file.path().to_str().unwrap()).unwrap();
        assert_eq!(token, "test-token-123");
    }

    #[test]
    fn test_read_token_file_trims_whitespace() {
        let mut temp_file = NamedTempFile::new().unwrap();
        write!(temp_file, "  test-token-123  \n").unwrap();
        let token = read_token_file(temp_file.path().to_str().unwrap()).unwrap();
        assert_eq!(token, "test-token-123");
    }
}
