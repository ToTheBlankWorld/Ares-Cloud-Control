use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuCoreMetrics {
    pub id: usize,
    pub usage_percent: f32,
    pub frequency_mhz: Option<u64>,
    pub temperature_celsius: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuMetrics {
    pub total_usage_percent: f32,
    pub cores: Vec<CpuCoreMetrics>,
    pub load_average: LoadAverage,
    pub core_count: usize,
    pub thread_count: usize,
    pub frequencies_mhz: Vec<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadAverage {
    pub one: f64,
    pub five: f64,
    pub fifteen: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryMetrics {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub free_bytes: u64,
    pub cached_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapMetrics {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuMetrics {
    pub available: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub devices: Option<Vec<GpuDeviceMetrics>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuDeviceMetrics {
    pub index: u32,
    pub name: String,
    pub utilization_percent: f32,
    pub memory_total_bytes: u64,
    pub memory_used_bytes: u64,
    pub memory_free_bytes: u64,
    pub temperature_celsius: Option<f32>,
    pub power_usage_watts: Option<f32>,
    pub power_limit_watts: Option<f32>,
    pub gpu_clock_mhz: Option<u32>,
    pub memory_clock_mhz: Option<u32>,
    pub fan_speed_percent: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskMetrics {
    pub filesystems: Vec<FilesystemMetrics>,
    pub io: Option<DiskIoMetrics>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilesystemMetrics {
    pub mount_point: String,
    pub filesystem: String,
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub usage_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskIoMetrics {
    pub read_bytes_per_sec: u64,
    pub write_bytes_per_sec: u64,
    pub read_ops_per_sec: u64,
    pub write_ops_per_sec: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkMetrics {
    pub interfaces: Vec<NetworkInterfaceMetrics>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInterfaceMetrics {
    pub name: String,
    pub ipv4_addresses: Vec<String>,
    pub ipv6_addresses: Vec<String>,
    pub received_bytes: u64,
    pub transmitted_bytes: u64,
    pub received_bytes_per_sec: u64,
    pub transmitted_bytes_per_sec: u64,
    pub is_up: bool,
    pub is_loopback: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessMetrics {
    pub pid: u32,
    pub name: String,
    pub command: String,
    pub user: String,
    pub cpu_percent: f32,
    pub memory_bytes: u64,
    pub thread_count: u32,
    pub state: ProcessState,
    pub start_time: u64,
    pub run_time: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProcessState {
    Running,
    Sleeping,
    Stopped,
    Zombie,
    Dead,
    Idle,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerMetrics {
    pub available: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub containers: Option<Vec<ContainerMetrics>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerMetrics {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: String,
    pub state: String,
    pub cpu_percent: Option<f32>,
    pub memory_bytes: Option<u64>,
    pub memory_limit_bytes: Option<u64>,
    pub network_rx_bytes: Option<u64>,
    pub network_tx_bytes: Option<u64>,
    pub restart_count: Option<u64>,
    pub created: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub hostname: String,
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: String,
    pub architecture: String,
    pub uptime_seconds: u64,
    pub boot_time: DateTime<Utc>,
    pub agent_version: String,
    pub server_timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemperatureMetrics {
    pub cpu_package: Option<f32>,
    pub cpu_cores: Vec<Option<f32>>,
    pub gpu: Vec<Option<f32>>,
    pub other: HashMap<String, f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FullMetricsSnapshot {
    pub timestamp: DateTime<Utc>,
    pub cpu: CpuMetrics,
    pub memory: MemoryMetrics,
    pub swap: SwapMetrics,
    pub gpu: GpuMetrics,
    pub disk: DiskMetrics,
    pub network: NetworkMetrics,
    pub processes: Vec<ProcessMetrics>,
    pub docker: DockerMetrics,
    pub system: SystemInfo,
    pub temperature: TemperatureMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub uptime_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusResponse {
    pub healthy: bool,
    pub collectors: CollectorStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectorStatus {
    pub cpu: bool,
    pub memory: bool,
    pub disk: bool,
    pub network: bool,
    pub processes: bool,
    pub gpu: bool,
    pub docker: bool,
    pub temperature: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessQuery {
    pub sort_by: Option<ProcessSortBy>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProcessSortBy {
    Cpu,
    Memory,
    Pid,
    Name,
}

impl Default for ProcessQuery {
    fn default() -> Self {
        Self {
            sort_by: Some(ProcessSortBy::Cpu),
            limit: Some(100),
            offset: Some(0),
        }
    }
}
