use crate::error::Result;
use crate::models::*;
use chrono::Utc;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

pub struct MetricsState {
    snapshot: RwLock<FullMetricsSnapshot>,
    last_update: RwLock<Instant>,
    collector_status: RwLock<CollectorStatus>,
}

impl MetricsState {
    pub fn new(initial_snapshot: FullMetricsSnapshot) -> Self {
        Self {
            snapshot: RwLock::new(initial_snapshot),
            last_update: RwLock::new(Instant::now()),
            collector_status: RwLock::new(CollectorStatus {
                cpu: false,
                memory: false,
                disk: false,
                network: false,
                processes: false,
                gpu: false,
                docker: false,
                temperature: false,
            }),
        }
    }

    pub async fn get_snapshot(&self) -> FullMetricsSnapshot {
        self.snapshot.read().await.clone()
    }

    pub async fn update_snapshot<F>(&self, updater: F) -> Result<()>
    where
        F: FnOnce(&mut FullMetricsSnapshot),
    {
        let mut snapshot = self.snapshot.write().await;
        updater(&mut snapshot);
        snapshot.timestamp = Utc::now();
        *self.last_update.write().await = Instant::now();
        Ok(())
    }

    pub async fn update_collector_status(&self, status: CollectorStatus) {
        *self.collector_status.write().await = status;
    }

    pub async fn get_collector_status(&self) -> CollectorStatus {
        self.collector_status.read().await.clone()
    }

    pub async fn last_update_elapsed(&self) -> Duration {
        self.last_update.read().await.elapsed()
    }
}

pub type SharedMetricsState = Arc<MetricsState>;

pub fn create_initial_snapshot() -> FullMetricsSnapshot {
    let now = Utc::now();
    FullMetricsSnapshot {
        timestamp: now,
        cpu: CpuMetrics {
            total_usage_percent: 0.0,
            cores: Vec::new(),
            load_average: LoadAverage {
                one: 0.0,
                five: 0.0,
                fifteen: 0.0,
            },
            core_count: 0,
            thread_count: 0,
            frequencies_mhz: Vec::new(),
        },
        memory: MemoryMetrics {
            total_bytes: 0,
            used_bytes: 0,
            available_bytes: 0,
            free_bytes: 0,
            cached_bytes: 0,
        },
        swap: SwapMetrics {
            total_bytes: 0,
            used_bytes: 0,
            free_bytes: 0,
        },
        gpu: GpuMetrics {
            available: false,
            devices: None,
        },
        disk: DiskMetrics {
            filesystems: Vec::new(),
            io: None,
        },
        network: NetworkMetrics {
            interfaces: Vec::new(),
        },
        processes: Vec::new(),
        docker: DockerMetrics {
            available: false,
            containers: None,
        },
        system: SystemInfo {
            hostname: String::new(),
            os_name: String::new(),
            os_version: String::new(),
            kernel_version: String::new(),
            architecture: String::new(),
            uptime_seconds: 0,
            boot_time: now,
            agent_version: env!("CARGO_PKG_VERSION").to_string(),
            server_timestamp: now,
        },
        temperature: TemperatureMetrics {
            cpu_package: None,
            cpu_cores: Vec::new(),
            gpu: Vec::new(),
            other: std::collections::HashMap::new(),
        },
    }
}
