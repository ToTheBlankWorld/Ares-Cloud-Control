use crate::error::{AgentError, Result};
use crate::models::*;
use crate::state::SharedMetricsState;
use crate::websocket::websocket_handler;
use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Json, Response},
    routing::get,
    Router,
};
use std::sync::Arc;
use subtle::ConstantTimeEq;
use tracing::{debug, info, warn};

pub fn create_router(state: SharedMetricsState, token: String) -> Router {
    let protected_router = Router::new()
        .route("/api/status", get(status_handler))
        .route("/api/system", get(system_handler))
        .route("/api/cpu", get(cpu_handler))
        .route("/api/memory", get(memory_handler))
        .route("/api/gpu", get(gpu_handler))
        .route("/api/disk", get(disk_handler))
        .route("/api/network", get(network_handler))
        .route("/api/processes", get(processes_handler))
        .route("/api/docker", get(docker_handler))
        .route("/api/metrics", get(full_metrics_handler))
        .route("/ws", get(websocket_handler))
        .layer(middleware::from_fn_with_state(
            token.clone(),
            auth_middleware,
        ));

    Router::new()
        .route("/api/health", get(health_handler))
        .merge(protected_router)
        .with_state(state)
}

async fn health_handler(State(state): State<SharedMetricsState>) -> impl IntoResponse {
    let snapshot = state.get_snapshot().await;
    Json(HealthResponse {
        status: "healthy".to_string(),
        version: snapshot.system.agent_version,
        uptime_seconds: snapshot.system.uptime_seconds,
    })
}

async fn status_handler(State(state): State<SharedMetricsState>) -> impl IntoResponse {
    let collector_status = state.get_collector_status().await;
    Json(StatusResponse {
        healthy: collector_status.cpu && collector_status.memory,
        collectors: collector_status,
    })
}

async fn system_handler(State(state): State<SharedMetricsState>) -> impl IntoResponse {
    let snapshot = state.get_snapshot().await;
    Json(snapshot.system)
}

async fn cpu_handler(State(state): State<SharedMetricsState>) -> impl IntoResponse {
    let snapshot = state.get_snapshot().await;
    Json(snapshot.cpu)
}

async fn memory_handler(State(state): State<SharedMetricsState>) -> impl IntoResponse {
    let snapshot = state.get_snapshot().await;
    Json(serde_json::json!({
        "memory": snapshot.memory,
        "swap": snapshot.swap
    }))
}

async fn gpu_handler(State(state): State<SharedMetricsState>) -> impl IntoResponse {
    let snapshot = state.get_snapshot().await;
    Json(snapshot.gpu)
}

async fn disk_handler(State(state): State<SharedMetricsState>) -> impl IntoResponse {
    let snapshot = state.get_snapshot().await;
    Json(snapshot.disk)
}

async fn network_handler(State(state): State<SharedMetricsState>) -> impl IntoResponse {
    let snapshot = state.get_snapshot().await;
    Json(snapshot.network)
}

async fn processes_handler(
    State(state): State<SharedMetricsState>,
    Query(params): Query<ProcessQuery>,
) -> impl IntoResponse {
    let snapshot = state.get_snapshot().await;
    let sort_by = params.sort_by.unwrap_or(ProcessSortBy::Cpu);
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);

    let mut processes = snapshot.processes.clone();

    match sort_by {
        ProcessSortBy::Cpu => processes.sort_by(|a, b| {
            b.cpu_percent
                .partial_cmp(&a.cpu_percent)
                .unwrap_or(std::cmp::Ordering::Equal)
        }),
        ProcessSortBy::Memory => processes.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes)),
        ProcessSortBy::Pid => processes.sort_by(|a, b| a.pid.cmp(&b.pid)),
        ProcessSortBy::Name => processes.sort_by(|a, b| a.name.cmp(&b.name)),
    }

    let start = offset.min(processes.len());
    let end = (start + limit).min(processes.len());
    Json(processes[start..end].to_vec())
}

async fn docker_handler(State(state): State<SharedMetricsState>) -> impl IntoResponse {
    let snapshot = state.get_snapshot().await;
    Json(snapshot.docker)
}

async fn full_metrics_handler(State(state): State<SharedMetricsState>) -> impl IntoResponse {
    let snapshot = state.get_snapshot().await;
    Json(snapshot)
}

async fn auth_middleware(
    State(token): State<String>,
    headers: HeaderMap,
    req: axum::http::Request<axum::body::Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = headers.get("authorization").and_then(|h| h.to_str().ok());

    let valid = match auth_header {
        Some(header) if header.starts_with("Bearer ") => {
            let provided = &header[7..];
            constant_time_eq(provided.as_bytes(), token.as_bytes())
        }
        Some(header) if header.starts_with("Token ") => {
            let provided = &header[6..];
            constant_time_eq(provided.as_bytes(), token.as_bytes())
        }
        _ => false,
    };

    if !valid {
        warn!("Authentication failed for request to {}", req.uri().path());
        return Err(StatusCode::UNAUTHORIZED);
    }

    debug!("Authentication successful for {}", req.uri().path());
    Ok(next.run(req).await)
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.ct_eq(b).into()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::create_initial_snapshot;
    use axum_test::TestServer;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_health_endpoint() {
        let state = Arc::new(crate::state::MetricsState::new(create_initial_snapshot()));
        let app = create_router(state, "test-token".to_string());
        let server = TestServer::new(app).unwrap();

        let response = server.get("/api/health").await;
        response.assert_status_ok();
        let body: HealthResponse = response.json();
        assert_eq!(body.status, "healthy");
    }

    #[tokio::test]
    async fn test_auth_required() {
        let state = Arc::new(crate::state::MetricsState::new(create_initial_snapshot()));
        let app = create_router(state, "test-token".to_string());
        let server = TestServer::new(app).unwrap();

        let response = server.get("/api/system").await;
        response.assert_status(StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_with_bearer() {
        let state = Arc::new(crate::state::MetricsState::new(create_initial_snapshot()));
        let app = create_router(state, "test-token".to_string());
        let server = TestServer::new(app).unwrap();

        let response = server
            .get("/api/system")
            .add_header("Authorization", "Bearer test-token")
            .await;
        response.assert_status_ok();
    }

    #[tokio::test]
    async fn test_auth_with_token_prefix() {
        let state = Arc::new(crate::state::MetricsState::new(create_initial_snapshot()));
        let app = create_router(state, "test-token".to_string());
        let server = TestServer::new(app).unwrap();

        let response = server
            .get("/api/system")
            .add_header("Authorization", "Token test-token")
            .await;
        response.assert_status_ok();
    }

    #[tokio::test]
    async fn test_auth_rejects_wrong_token() {
        let state = Arc::new(crate::state::MetricsState::new(create_initial_snapshot()));
        let app = create_router(state, "test-token".to_string());
        let server = TestServer::new(app).unwrap();

        let response = server
            .get("/api/system")
            .add_header("Authorization", "Bearer wrong-token")
            .await;
        response.assert_status(StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_rejects_malformed_header() {
        let state = Arc::new(crate::state::MetricsState::new(create_initial_snapshot()));
        let app = create_router(state, "test-token".to_string());
        let server = TestServer::new(app).unwrap();

        let response = server
            .get("/api/system")
            .add_header("Authorization", "Basic dXNlcjpwYXNz")
            .await;
        response.assert_status(StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_constant_time_eq() {
        assert!(constant_time_eq(b"test", b"test"));
        assert!(!constant_time_eq(b"test", b"wrong"));
        assert!(!constant_time_eq(b"short", b"longer"));
        assert!(!constant_time_eq(b"", b"nonempty"));
    }
}
