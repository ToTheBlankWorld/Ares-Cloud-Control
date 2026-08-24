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
import { getAgentCredentials, getStoredServers, addStoredServer, removeStoredServer, type StoredServer } from '@/services/agentConfig'
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

async function requestWithCredentials<T>(baseUrl: string, token: string | undefined, path: string, init?: RequestInit): Promise<T> {
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

async function fetchSnapshotWithCredentials(baseUrl: string, token: string | undefined): Promise<MetricsSnapshot> {
  try {
    return await requestWithCredentials<MetricsSnapshot>(baseUrl, token, '/api/metrics')
  } catch (error) {
    if (error instanceof AgentError && error.status !== 404) throw error
    const [system, cpu, memory, disk, network] = await Promise.all([
      requestWithCredentials<SystemInfo>(baseUrl, token, '/api/system'),
      requestWithCredentials<CpuMetrics>(baseUrl, token, '/api/cpu'),
      requestWithCredentials<MemoryMetrics>(baseUrl, token, '/api/memory'),
      requestWithCredentials<DiskMetrics>(baseUrl, token, '/api/disk'),
      requestWithCredentials<NetworkMetrics>(baseUrl, token, '/api/network'),
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

  // Handle both memory formats:
  // - Mock/nested format: { memory: MemoryUsage, swap: SwapUsage }
  // - Live Rust agent flat format: MemoryUsage (direct)
  const mem = 'memory' in snapshot.memory ? (snapshot.memory as { memory: { total_bytes: number; used_bytes: number } }).memory : snapshot.memory

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
      usagePercent: mem.total_bytes > 0 ? (mem.used_bytes / mem.total_bytes) * 100 : 0,
      totalBytes: mem.total_bytes,
      usedBytes: mem.used_bytes,
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
    const servers: Server[] = []

    // Add global agent if configured
    const { baseUrl } = getAgentCredentials()
    if (baseUrl) {
      try {
        const snapshot = await fetchSnapshot()
        servers.push(snapshotToServer(snapshot.system.hostname, baseUrl, snapshot))
      } catch {
        // Global agent unreachable - don't include it
      }
    }

    // Add user-configured servers from localStorage
    const storedServers = getStoredServers()
    for (const stored of storedServers) {
      try {
        const snapshot = await fetchSnapshotWithCredentials(stored.agentUrl, stored.token)
        servers.push(snapshotToServer(stored.id, stored.agentUrl, snapshot))
      } catch {
        // Server unreachable - include with offline status
        servers.push({
          id: stored.id,
          name: stored.name,
          hostname: stored.name,
          agentUrl: stored.agentUrl,
          os: 'Unknown',
          osFamily: 'ubuntu',
          region: 'unassigned',
          tags: ['offline'],
          status: 'offline',
          agentVersion: 'Unknown',
          uptimeSeconds: 0,
          cpu: { usagePercent: 0, cores: 0, loadOne: 0 },
          memory: { usagePercent: 0, totalBytes: 0, usedBytes: 0 },
          disk: { usagePercent: 0, totalBytes: 0, usedBytes: 0 },
          network: { rxBytesPerSec: 0, txBytesPerSec: 0 },
          hasGpu: false,
          sparkline: [],
        })
      }
    }

    return servers
  },

  async getServer(id: string): Promise<Server | null> {
    const servers = await this.listServers()
    return servers.find((s) => s.id === id) ?? null
  },

  async getMetrics(serverId: string): Promise<MetricsSnapshot> {
    // Try to find the server in stored servers first
    const storedServers = getStoredServers()
    const stored = storedServers.find((s) => s.id === serverId)
    if (stored) {
      return fetchSnapshotWithCredentials(stored.agentUrl, stored.token)
    }
    // Fall back to global agent
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
    const normalisedUrl = normaliseBaseUrl(input.agentUrl)
    const id = input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'server'

    // Fetch snapshot using the provided credentials to validate and get server info
    const snapshot = await fetchSnapshotWithCredentials(normalisedUrl, input.token || undefined)

    // Persist the server configuration
    const storedServer: StoredServer = {
      id,
      name: input.name.trim(),
      agentUrl: normalisedUrl,
      token: input.token.trim(),
    }
    addStoredServer(storedServer)

    return { ...snapshotToServer(id, normalisedUrl, snapshot), name: input.name.trim() }
  },

  async removeServer(id: string): Promise<void> {
    removeStoredServer(id)
  },

  async restartAgent(serverId: string): Promise<void> {
    const storedServers = getStoredServers()
    const stored = storedServers.find((s) => s.id === serverId)
    if (stored) {
      await requestWithCredentials(stored.agentUrl, stored.token, '/api/agent/restart', { method: 'POST' })
    } else {
      // Fall back to global agent
      await request<void>('/api/agent/restart', { method: 'POST' })
    }
  },
}
