pub mod cpu;
pub mod disk;
pub mod docker;
pub mod gpu;
pub mod memory;
pub mod network;
pub mod processes;
pub mod system;
pub mod temperature;

use crate::error::Result;
use crate::state::SharedMetricsState;
use std::time::Duration;
use tokio::time::interval;
use tracing::{error, info, warn};

pub struct MetricsOrchestrator {
    state: SharedMetricsState,
    cpu_collector: cpu::CpuCollector,
    memory_collector: memory::MemoryCollector,
    disk_collector: disk::DiskCollector,
    network_collector: network::NetworkCollector,
    process_collector: processes::ProcessCollector,
    gpu_collector: gpu::GpuCollector,
    docker_collector: docker::DockerCollector,
    system_collector: system::SystemCollector,
    temperature_collector: temperature::TemperatureCollector,
    interval_ms: u64,
}

impl MetricsOrchestrator {
    pub fn new(
        state: SharedMetricsState,
        interval_ms: u64,
        process_limit: usize,
        docker_socket: String,
        gpu_enabled: bool,
        docker_enabled: bool,
    ) -> Self {
        Self {
            state,
            cpu_collector: cpu::CpuCollector::new(),
            memory_collector: memory::MemoryCollector::new(),
            disk_collector: disk::DiskCollector::new(),
            network_collector: network::NetworkCollector::new(),
            process_collector: processes::ProcessCollector::new(process_limit),
            gpu_collector: if gpu_enabled {
                gpu::GpuCollector::new()
            } else {
                gpu::GpuCollector {
                    nvml: None,
                    available: false,
                }
            },
            docker_collector: if docker_enabled {
                docker::DockerCollector::new(&docker_socket)
            } else {
                docker::DockerCollector {
                    docker: None,
                    available: false,
                    prev_stats: std::collections::HashMap::new(),
                    last_update: None,
                }
            },
            system_collector: system::SystemCollector::new(),
            temperature_collector: temperature::TemperatureCollector::new(),
            interval_ms,
        }
    }

    pub async fn run_collection_loop(&mut self) {
        let mut interval = interval(Duration::from_millis(self.interval_ms));
        info!(
            "Starting metrics collection loop with interval {}ms",
            self.interval_ms
        );

        loop {
            interval.tick().await;
            if let Err(e) = self.collect_all().await {
                error!("Failed to collect metrics: {}", e);
            }
        }
    }

    async fn collect_all(&mut self) -> Result<()> {
        let mut collector_status = crate::models::CollectorStatus {
            cpu: false,
            memory: false,
            disk: false,
            network: false,
            processes: false,
            gpu: false,
            docker: false,
            temperature: false,
        };

        let cpu = match self.cpu_collector.collect() {
            Ok(c) => {
                collector_status.cpu = true;
                c
            }
            Err(e) => {
                warn!("CPU collection failed: {}", e);
                self.state.get_snapshot().await.cpu
            }
        };

        let (memory, swap) = match self.memory_collector.collect() {
            Ok((m, s)) => {
                collector_status.memory = true;
                (m, s)
            }
            Err(e) => {
                warn!("Memory collection failed: {}", e);
                let snap = self.state.get_snapshot().await;
                (snap.memory, snap.swap)
            }
        };

        let disk = match self.disk_collector.collect() {
            Ok(d) => {
                collector_status.disk = true;
                d
            }
            Err(e) => {
                warn!("Disk collection failed: {}", e);
                self.state.get_snapshot().await.disk
            }
        };

        let network = match self.network_collector.collect() {
            Ok(n) => {
                collector_status.network = true;
                n
            }
            Err(e) => {
                warn!("Network collection failed: {}", e);
                self.state.get_snapshot().await.network
            }
        };

        let processes = match self.process_collector.collect() {
            Ok(p) => {
                collector_status.processes = true;
                p
            }
            Err(e) => {
                warn!("Process collection failed: {}", e);
                self.state.get_snapshot().await.processes
            }
        };

        let gpu = match self.gpu_collector.collect() {
            Ok(g) => {
                collector_status.gpu = true;
                g
            }
            Err(e) => {
                warn!("GPU collection failed: {}", e);
                self.state.get_snapshot().await.gpu
            }
        };

        let docker = match self.docker_collector.collect().await {
            Ok(d) => {
                collector_status.docker = true;
                d
            }
            Err(e) => {
                warn!("Docker collection failed: {}", e);
                self.state.get_snapshot().await.docker
            }
        };

        let system = match self.system_collector.collect() {
            Ok(s) => s,
            Err(e) => {
                warn!("System collection failed: {}", e);
                self.state.get_snapshot().await.system
            }
        };

        let temperature = match self.temperature_collector.collect() {
            Ok(t) => {
                collector_status.temperature = true;
                t
            }
            Err(e) => {
                warn!("Temperature collection failed: {}", e);
                self.state.get_snapshot().await.temperature
            }
        };

        self.state
            .update_snapshot(|snap| {
                snap.timestamp = chrono::Utc::now();
                snap.cpu = cpu;
                snap.memory = memory;
                snap.swap = swap;
                snap.disk = disk;
                snap.network = network;
                snap.processes = processes;
                snap.gpu = gpu;
                snap.docker = docker;
                snap.system = system;
                snap.temperature = temperature;
            })
            .await?;

        self.state.update_collector_status(collector_status).await;
        Ok(())
    }
}

pub async fn spawn_metrics_collector(
    state: SharedMetricsState,
    interval_ms: u64,
    process_limit: usize,
    docker_socket: String,
    gpu_enabled: bool,
    docker_enabled: bool,
) {
    let mut orchestrator = MetricsOrchestrator::new(
        state,
        interval_ms,
        process_limit,
        docker_socket,
        gpu_enabled,
        docker_enabled,
    );
    orchestrator.run_collection_loop().await;
}
