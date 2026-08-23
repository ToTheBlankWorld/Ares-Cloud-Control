/**
 * Live data source for the ARES monitoring agent (the Rust binary in `agent/`).
 *
 * Not active by default. Enable it by setting `VITE_DATA_SOURCE=api` together
 * with `VITE_AGENT_URL`, or by switching the source at runtime from
 * Settings -> Servers. Every method maps 1:1 onto an endpoint documented in
 * `docs/API.md`, and returns the same types `mockService` returns, so no UI
 * component needs to change when the switch is flipped.
 */

import { buildSeries } from '@/data/mockData'
import { getAgentCredentials } from '@/services/agentConfig'
import type {
  Alert,
  AresDataSource,
  ConnectionTestResult,
  CpuMetrics,
  DiskMetrics,
  HealthResponse,
  MemoryMetrics,
  MetricsSnapshot,
  NetworkMetrics,
  NewServerInput,
  SeriesPoint,
  Server,
  SystemInfo,
  TimeRange,
} from '@/types'

const REQUEST_TIMEOUT_MS = 8000

class AgentError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AgentError'
    this.status = status
  }
}

function normaliseBaseUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.origin
  } catch {
    return url.replace(/\/+$/, '')
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, token } = getAgentCredentials()
  if (!baseUrl) {
    throw new AgentError('No agent URL configured. Set VITE_AGENT_URL or add one in Settings.', 0)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${normaliseBaseUrl(baseUrl)}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })

    if (!response.ok) {
      throw new AgentError(`Agent responded ${response.status} for ${path}`, response.status)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

function osFamilyFrom(osName: string): Server['osFamily'] {
  const name = osName.toLowerCase()
  if (name.includes('debian')) return 'debian'
  if (name.includes('alpine')) return 'alpine'
  if (name.includes('rocky') || name.includes('red hat') || name.includes('centos')) return 'rocky'
  if (name.includes('arch')) return 'arch'
  return 'ubuntu'
}

/** Collapses a full agent snapshot into the summary shape the server list renders. */
export function snapshotToServer(id: string, agentUrl: string, snapshot: MetricsSnapshot): Server {
  const root = snapshot.disk.filesystems.find((fs) => fs.mount_point === '/') ?? snapshot.disk.filesystems[0]
  const primary =
    snapshot.network.interfaces.find((i) => !i.is_loopback && i.is_up) ?? snapshot.network.interfaces[0]
  const memory = snapshot.memory.memory

  return {
    id,
    name: snapshot.system.hostname,
    hostname: snapshot.system.hostname,
    agentUrl,
    os: snapshot.system.os_version,
    osFamily: osFamilyFrom(snapshot.system.os_name),
    region: 'unassigned',
    tags: [],
    status: 'online',
    agentVersion: snapshot.system.agent_version,
    uptimeSeconds: snapshot.system.uptime_seconds,
    cpu: {
      usagePercent: snapshot.cpu.total_usage_percent,
      cores: snapshot.cpu.core_count,
      loadOne: snapshot.cpu.load_average.one,
    },
    memory: {
      usagePercent: memory.total_bytes > 0 ? (memory.used_bytes / memory.total_bytes) * 100 : 0,
      totalBytes: memory.total_bytes,
      usedBytes: memory.used_bytes,
    },
    disk: {
      usagePercent: root?.usage_percent ?? 0,
      totalBytes: root?.total_bytes ?? 0,
      usedBytes: root?.used_bytes ?? 0,
    },
    network: {
      rxBytesPerSec: primary?.received_bytes_per_sec ?? 0,
      txBytesPerSec: primary?.transmitted_bytes_per_sec ?? 0,
    },
    hasGpu: snapshot.gpu.available,
    sparkline: [],
  }
}

async function fetchSnapshot(): Promise<MetricsSnapshot> {
  // `/api/metrics` returns everything in one round trip; the granular endpoints
  // are the fallback for agents that predate it.
  try {
    return await request<MetricsSnapshot>('/api/metrics')
  } catch (error) {
    if (error instanceof AgentError && error.status !== 404) throw error
    const [system, cpu, memory, disk, network] = await Promise.all([
      request<SystemInfo>('/api/system'),
      request<CpuMetrics>('/api/cpu'),
      request<MemoryMetrics>('/api/memory'),
      request<DiskMetrics>('/api/disk'),
      request<NetworkMetrics>('/api/network'),
    ])
    return {
      timestamp: new Date().toISOString(),
      system,
      cpu,
      memory,
      disk,
      network,
      gpu: { available: false, devices: null },
      temperature: { sensors: [] },
      processes: [],
      docker: { available: false, containers: null },
    }
  }
}

export const apiService: AresDataSource = {
  source: 'api',

  async listServers(): Promise<Server[]> {
    const { baseUrl } = getAgentCredentials()
    const snapshot = await fetchSnapshot()
    return [snapshotToServer(snapshot.system.hostname, baseUrl ?? '', snapshot)]
  },

  async getServer(id: string): Promise<Server | null> {
    const servers = await this.listServers()
    return servers.find((s) => s.id === id) ?? null
  },

  async getMetrics(): Promise<MetricsSnapshot> {
    return fetchSnapshot()
  },

  /**
   * The agent exposes instantaneous values, not history. Until a retention
   * store exists behind it, the chart series is still generated locally.
   */
  async getSeries(serverId: string, range: TimeRange): Promise<SeriesPoint[]> {
    return buildSeries(serverId, range)
  },

  /** The agent has no alerting engine yet; evaluation happens client-side. */
  async listAlerts(): Promise<Alert[]> {
    return []
  },

  async testConnection(agentUrl: string, token: string): Promise<ConnectionTestResult> {
    let parsed: URL
    try {
      parsed = new URL(agentUrl)
    } catch {
      return { ok: false, reason: 'invalid-url', message: 'Enter a full URL, including https://' }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const started = performance.now()

    try {
      const response = await fetch(`${normaliseBaseUrl(parsed.toString())}/api/health`, {
        signal: controller.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (response.status === 401 || response.status === 403) {
        return { ok: false, reason: 'unauthorized', message: 'The agent rejected this token.' }
      }
      if (!response.ok) {
        return { ok: false, reason: 'unreachable', message: `Agent responded ${response.status}.` }
      }
      const health = (await response.json()) as HealthResponse
      return { ok: true, latencyMs: Math.round(performance.now() - started), version: health.version }
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError'
      return aborted
        ? { ok: false, reason: 'timeout', message: 'The agent did not respond within 8 seconds.' }
        : { ok: false, reason: 'unreachable', message: `Could not reach ${parsed.host}.` }
    } finally {
      clearTimeout(timer)
    }
  },

  async addServer(input: NewServerInput): Promise<Server> {
    const snapshot = await fetchSnapshot()
    return { ...snapshotToServer(snapshot.system.hostname, input.agentUrl, snapshot), name: input.name }
  },

  async removeServer(): Promise<void> {
    // Registration is client-side; nothing to unregister on the agent.
  },

  async restartAgent(): Promise<void> {
    await request<void>('/api/agent/restart', { method: 'POST' })
  },
}
