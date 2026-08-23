use crate::error::Result;
use crate::models::FullMetricsSnapshot;
use crate::state::SharedMetricsState;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
};
use futures_util::{SinkExt, StreamExt};
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::interval;
use tracing::{debug, info, warn};

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<SharedMetricsState>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: SharedMetricsState) {
    let (mut sender, mut receiver) = socket.split();
    let mut interval = interval(Duration::from_millis(1000));
    info!("WebSocket client connected");

    // Channel for backpressure handling - bounded to prevent unbounded memory growth
    let (tx, mut rx) = mpsc::channel::<String>(10);

    // Spawn a task to handle sending with backpressure
    let mut send_task_sender = sender.clone();
    let send_task = tokio::spawn(async move {
        while let Some(json) = rx.recv().await {
            if send_task_sender
                .send(Message::Text(json.into()))
                .await
                .is_err()
            {
                debug!("WebSocket client disconnected during send");
                break;
            }
        }
    });

    loop {
        tokio::select! {
            _ = interval.tick() => {
                let snapshot = state.get_snapshot().await;
                match serde_json::to_string(&snapshot) {
                    Ok(json) => {
                        // Non-blocking send with backpressure - drop if buffer full
                        if tx.try_send(json).is_err() {
                            debug!("WebSocket send buffer full, dropping frame (backpressure)");
                        }
                    }
                    Err(e) => {
                        warn!("Failed to serialize metrics snapshot: {}", e);
                        break;
                    }
                }
            }
            msg = receiver.next() => {
                match msg {
                    Some(Ok(Message::Close(_))) => {
                        debug!("WebSocket client sent close frame");
                        break;
                    }
                    Some(Ok(Message::Ping(data))) => {
                        if sender.send(Message::Pong(data)).await.is_err() {
                            break;
                        }
                    }
                    Some(Ok(Message::Pong(_))) => {
                        // Client responded to ping
                    }
                    Some(Err(e)) => {
                        debug!("WebSocket error: {}", e);
                        break;
                    }
                    None => {
                        debug!("WebSocket stream ended");
                        break;
                    }
                    _ => {}
                }
            }
        }
    }

    // Clean up
    drop(tx);
    let _ = send_task.await;
    info!("WebSocket client disconnected");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::create_initial_snapshot;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_websocket_handler_creation() {
        let state = Arc::new(crate::state::MetricsState::new(create_initial_snapshot()));
    }
}
