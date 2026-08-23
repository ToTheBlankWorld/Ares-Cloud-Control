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
    let (sender, mut receiver) = socket.split();
    let mut interval = interval(Duration::from_millis(1000));
    info!("WebSocket client connected");

    // Channel for outgoing messages - bounded to prevent unbounded memory growth
    let (tx, mut rx) = mpsc::channel::<WsMessage>(10);

    // Spawn a single writer task that owns the sender
    let send_task = tokio::spawn(async move {
        let mut sender = sender;
        while let Some(msg) = rx.recv().await {
            match msg {
                WsMessage::Text(json) => {
                    if sender.send(Message::Text(json.into())).await.is_err() {
                        debug!("WebSocket client disconnected during send");
                        break;
                    }
                }
                WsMessage::Pong(data) => {
                    if sender.send(Message::Pong(data.into())).await.is_err() {
                        break;
                    }
                }
                WsMessage::Close => {
                    let _ = sender.send(Message::Close(None)).await;
                    break;
                }
            }
        }
    });

    loop {
        tokio::select! {
            _ = interval.tick() => {
                let snapshot = state.get_snapshot().await;
                match serde_json::to_string(&snapshot) {
                    Ok(json) => {
                        if tx.try_send(WsMessage::Text(json)).is_err() {
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
                        let _ = tx.try_send(WsMessage::Close);
                        break;
                    }
                    Some(Ok(Message::Ping(data))) => {
                        // Convert Axum Bytes to Vec<u8> for internal channel
                        if tx.try_send(WsMessage::Pong(data.to_vec())).is_err() {
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

enum WsMessage {
    Text(String),
    Pong(Vec<u8>),
    Close,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::create_initial_snapshot;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_websocket_handler_creation() {
        let _state = Arc::new(crate::state::MetricsState::new(create_initial_snapshot()));
    }
}
