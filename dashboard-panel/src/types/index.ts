/**
 * Domain types for ARES Cloud Control.
 *
 * The metric shapes below mirror the ARES monitoring agent's JSON payloads
 * (see docs/API.md at the repository root) field-for-field, including
 * snake_case naming. Keeping them identical means `apiService` can hand raw
 * agent responses straight to the UI with no translation layer.
 */

/* ---------- System ---------- */

export interface HealthResponse {
  status: 'healthy' | 'degraded'
  version: string
  uptime_seconds: number
}

export interface CollectorStatus {
  cpu: boolean
  memory: boolean
  disk: boolean
  network: boolean
  processes: boolean
  gpu: boolean
  docker: boolean
  temperature: boolean
}

export interface SystemInfo {
  hostname: string
  os_name: string
  os_version: string
  kernel_version: string
  architecture: string
  uptime_seconds: number
  boot_time: string
  agent_version: string
  server_timestamp: string
}

/* ---------- CPU ---------- */

export interface CpuCore {
  id: number
  usage_percent: number
  frequency_mhz: number
  temperature_celsius: number | null
}

export interface LoadAverage {
  one: number
  five: number
  fifteen: number
}

export interface CpuMetrics {
  total_usage_percent: number
  cores: CpuCore[]
  load_average: LoadAverage
  core_count: number
  thread_count: number
  frequencies_mhz: number[]
}

/* ---------- Memory ---------- */

export interface MemoryUsage {
  total_bytes: number
  used_bytes: number
  available_bytes: number
  free_bytes: number
  cached_bytes: number
}

export interface SwapUsage {
  total_bytes: number
  used_bytes: number
  free_bytes: number
}

export interface MemoryMetrics {
  memory: MemoryUsage
  swap: SwapUsage
}

/* ---------- Disk ---------- */

export interface Filesystem {
  mount_point: string
  filesystem: string
  total_bytes: number
  used_bytes: number
  available_bytes: number
  usage_percent: number
}

export interface DiskIo {
  read_bytes_per_sec: number
  write_bytes_per_sec: number
  read_ops_per_sec: number
  write_ops_per_sec: number
}

export interface DiskMetrics {
  filesystems: Filesystem[]
  io: DiskIo
}

/* ---------- Network ---------- */

export interface NetworkInterface {
  name: string
  ipv4_addresses: string[]
  ipv6_addresses: string[]
  received_bytes: number
  transmitted_bytes: number
  received_bytes_per_sec: number
  transmitted_bytes_per_sec: number
  is_up: boolean
  is_loopback: boolean
}

export interface NetworkMetrics {
  interfaces: NetworkInterface[]
}

/* ---------- GPU ---------- */

export interface GpuDevice {
  index: number
  name: string
  utilization_percent: number
  memory_total_bytes: number
  memory_used_bytes: number
  memory_free_bytes: number
  temperature_celsius: number
  power_usage_watts: number
  power_limit_watts: number
  gpu_clock_mhz: number
  memory_clock_mhz: number
  fan_speed_percent: number
}

export interface GpuMetrics {
  available: boolean
  devices: GpuDevice[] | null
}

/* ---------- Temperature ---------- */

export interface TemperatureSensor {
  label: string
  temperature_celsius: number
  critical_celsius: number | null
}

export interface TemperatureMetrics {
  sensors: TemperatureSensor[]
}

/* ---------- Processes ---------- */

export type ProcessState = 'running' | 'sleeping' | 'idle' | 'zombie' | 'stopped'

export interface Process {
  pid: number
  name: string
  command: string
  user: string
  cpu_percent: number
  memory_bytes: number
  thread_count: number
  state: ProcessState
  start_time: number
  run_time: number
}

/* ---------- Docker ---------- */

export interface DockerContainer {
  id: string
  name: string
  image: string
  status: string
  state: 'running' | 'exited' | 'paused' | 'restarting'
  cpu_percent: number
  memory_bytes: number
  memory_limit_bytes: number
  network_rx_bytes: number
  network_tx_bytes: number
  restart_count: number
  created: string
  started_at: string
}

export interface DockerMetrics {
  available: boolean
  containers: DockerContainer[] | null
}

/* ---------- Aggregate snapshot (GET /api/metrics) ---------- */

export interface MetricsSnapshot {
  timestamp: string
  system: SystemInfo
  cpu: CpuMetrics
  memory: MemoryMetrics
  disk: DiskMetrics
  network: NetworkMetrics
  gpu: GpuMetrics
  temperature: TemperatureMetrics
  processes: Process[]
  docker: DockerMetrics
}

/* ---------- Dashboard-level entities ---------- */

export type ServerStatus = 'online' | 'offline' | 'degraded'

/** A machine registered in the control plane. */
export interface Server {
  id: string
  name: string
  hostname: string
  agentUrl: string
  os: string
  osFamily: 'ubuntu' | 'debian' | 'alpine' | 'rocky' | 'arch'
  region: string
  tags: string[]
  status: ServerStatus
  agentVersion: string
  uptimeSeconds: number
  cpu: { usagePercent: number; cores: number; loadOne: number }
  memory: { usagePercent: number; totalBytes: number; usedBytes: number }
  disk: { usagePercent: number; totalBytes: number; usedBytes: number }
  network: { rxBytesPerSec: number; txBytesPerSec: number }
  hasGpu: boolean
  /** Short recent-history series used by card sparklines. */
  sparkline: number[]
}

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertStatus = 'active' | 'resolved' | 'acknowledged'

export interface Alert {
  id: string
  serverId: string
  serverName: string
  severity: AlertSeverity
  status: AlertStatus
  title: string
  description: string
  metric: string
  value: string
  threshold: string
  /** ISO 8601 */
  timestamp: string
  resolvedAt: string | null
}

/* ---------- Time series ---------- */

export interface SeriesPoint {
  /** Epoch milliseconds. */
  t: number
  [key: string]: number
}

export type TimeRange = '5m' | '15m' | '1h' | '6h' | '24h'

export interface TimeRangeOption {
  value: TimeRange
  label: string
  /** Window length in minutes. */
  minutes: number
  /** Number of samples rendered for the window. */
  points: number
}

/* ---------- Connection / service layer ---------- */

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error'

export interface ConnectionInfo {
  state: ConnectionState
  source: 'mock' | 'api'
  agentUrl: string | null
  latencyMs: number | null
  lastSyncedAt: string | null
  message?: string
}

export type ConnectionTestResult =
  | { ok: true; latencyMs: number; version: string }
  | { ok: false; reason: 'unreachable' | 'unauthorized' | 'timeout' | 'invalid-url'; message: string }

export interface NewServerInput {
  name: string
  agentUrl: string
  token: string
}

/** Contract shared by mockService and apiService. */
export interface AresDataSource {
  readonly source: 'mock' | 'api'
  listServers(): Promise<Server[]>
  getServer(id: string): Promise<Server | null>
  getMetrics(serverId: string): Promise<MetricsSnapshot>
  getSeries(serverId: string, range: TimeRange): Promise<SeriesPoint[]>
  listAlerts(): Promise<Alert[]>
  testConnection(agentUrl: string, token: string): Promise<ConnectionTestResult>
  addServer(input: NewServerInput): Promise<Server>
  removeServer(id: string): Promise<void>
  restartAgent(serverId: string): Promise<void>
}
