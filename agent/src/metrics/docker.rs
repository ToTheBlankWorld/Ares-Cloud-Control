use crate::error::Result;
use crate::models::*;
use bollard::container::Stats;
use bollard::container::{ListContainersOptions, StatsOptions};
use bollard::Docker;
use chrono::{DateTime, Utc};
use futures_util::StreamExt;
use std::collections::HashMap;
use std::time::Duration;

pub struct DockerCollector {
    docker: Option<Docker>,
    available: bool,
    prev_stats: HashMap<String, ContainerStatsSnapshot>,
    last_update: Option<std::time::Instant>,
}

#[derive(Clone, Debug)]
struct ContainerStatsSnapshot {
    cpu_total: u64,
    cpu_system: u64,
    memory_usage: u64,
    network_rx: u64,
    network_tx: u64,
    timestamp: std::time::Instant,
}

impl DockerCollector {
    pub fn new(socket_path: &str) -> Self {
        let docker = Docker::connect_with_unix(socket_path, 30, bollard::API_DEFAULT_VERSION).ok();

        let available = docker.is_some();
        if available {
            tracing::info!("Docker client created for {}", socket_path);
        } else {
            tracing::warn!("Docker socket unavailable at {}", socket_path);
        }

        Self {
            docker,
            available,
            prev_stats: HashMap::new(),
            last_update: None,
        }
    }

    pub async fn collect(&mut self) -> Result<DockerMetrics> {
        if !self.available {
            return Ok(DockerMetrics {
                available: false,
                containers: None,
            });
        }

        let docker = self.docker.as_ref().unwrap();

        if docker.ping().await.is_err() {
            tracing::warn!("Docker daemon not reachable");
            self.available = false;
            return Ok(DockerMetrics {
                available: false,
                containers: None,
            });
        }

        let options = ListContainersOptions::<String> {
            all: true,
            ..Default::default()
        };

        let containers = match docker.list_containers(Some(options)).await {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("Failed to list Docker containers: {}", e);
                self.available = false;
                return Ok(DockerMetrics {
                    available: false,
                    containers: None,
                });
            }
        };

        let mut container_metrics = Vec::with_capacity(containers.len());

        let now = std::time::Instant::now();
        let elapsed = self.last_update.map_or(Duration::from_secs(1), |last| {
            now.duration_since(last).max(Duration::from_millis(100))
        });
        self.last_update = Some(now);

        for container in containers {
            let id = container.id.clone().unwrap_or_default();
            let name = container
                .names
                .as_ref()
                .and_then(|n| n.first())
                .cloned()
                .unwrap_or_default();
            let image = container.image.clone().unwrap_or_default();
            let status = container.status.clone().unwrap_or_default();
            let state = container.state.clone().unwrap_or_default();
            let created = container.created.unwrap_or(0);
            let created_dt =
                DateTime::from_timestamp(created as i64, 0).unwrap_or_else(|| Utc::now());

            let mut cpu_percent = None;
            let mut memory_bytes = None;
            let mut memory_limit_bytes = None;
            let mut network_rx_bytes = None;
            let mut network_tx_bytes = None;

            if state == "running" {
                let mut stats_stream = docker.stats(
                    &id,
                    Some(StatsOptions {
                        stream: false,
                        one_shot: true,
                    }),
                );

                if let Some(Ok(stats)) = stats_stream.next().await {
                    cpu_percent =
                        Self::calculate_cpu_percent(&stats, &mut self.prev_stats, &id, elapsed);
                    memory_bytes = stats.memory_stats.usage;
                    memory_limit_bytes = stats.memory_stats.limit;

                    if let Some(networks) = &stats.networks {
                        let mut rx = 0u64;
                        let mut tx = 0u64;
                        for (_, net) in networks {
                            rx += net.rx_bytes;
                            tx += net.tx_bytes;
                        }
                        network_rx_bytes = Some(rx);
                        network_tx_bytes = Some(tx);
                    }
                }
            }

            // ContainerSummary may not have started_at or restart_count in bollard 0.18
            let started_at = None;
            let restart_count = None;

            container_metrics.push(ContainerMetrics {
                id,
                name: name.trim_start_matches('/').to_string(),
                image,
                status,
                state,
                cpu_percent,
                memory_bytes,
                memory_limit_bytes,
                network_rx_bytes,
                network_tx_bytes,
                restart_count,
                created: created_dt,
                started_at,
            });
        }

        Ok(DockerMetrics {
            available: true,
            containers: Some(container_metrics),
        })
    }

    fn calculate_cpu_percent(
        stats: &Stats,
        prev_stats: &mut HashMap<String, ContainerStatsSnapshot>,
        container_id: &str,
        elapsed: Duration,
    ) -> Option<f32> {
        let cpu_total = stats.cpu_stats.cpu_usage.total_usage;
        let cpu_system = stats.cpu_stats.system_cpu_usage.unwrap_or(0);

        if let Some(prev) = prev_stats.get(container_id) {
            let cpu_delta = cpu_total.saturating_sub(prev.cpu_total) as f64;
            let system_delta = cpu_system.saturating_sub(prev.cpu_system) as f64;
            let dt = elapsed.as_secs_f64().max(0.1);

            if system_delta > 0.0 && cpu_delta > 0.0 {
                let percent = (cpu_delta / system_delta) * 100.0;
                prev_stats.insert(container_id.to_string(), Self::create_snapshot(stats));
                return Some(percent as f32);
            }
        }

        prev_stats.insert(container_id.to_string(), Self::create_snapshot(stats));
        None
    }

    fn create_snapshot(stats: &Stats) -> ContainerStatsSnapshot {
        let cpu_total = stats.cpu_stats.cpu_usage.total_usage;
        let cpu_system = stats.cpu_stats.system_cpu_usage.unwrap_or(0);
        ContainerStatsSnapshot {
            cpu_total,
            cpu_system,
            memory_usage: stats.memory_stats.usage.unwrap_or(0),
            network_rx: stats
                .networks
                .as_ref()
                .map(|n| n.values().map(|net| net.rx_bytes).sum())
                .unwrap_or(0),
            network_tx: stats
                .networks
                .as_ref()
                .map(|n| n.values().map(|net| net.tx_bytes).sum())
                .unwrap_or(0),
            timestamp: std::time::Instant::now(),
        }
    }
}

impl Default for DockerCollector {
    fn default() -> Self {
        Self::new("/var/run/docker.sock")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_docker_collector_creation() {
        let collector = DockerCollector::new("/var/run/docker.sock");
        assert!(!collector.available || collector.docker.is_some());
    }
}
