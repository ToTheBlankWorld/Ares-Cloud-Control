/**
 * In-memory data source backed by the fixtures in `src/data/mockData.ts`.
 *
 * Implements the same `AresDataSource` contract as `apiService`, including
 * realistic latency, so swapping between them changes nothing in the UI.
 */

import { buildSeries, buildSnapshot, buildServer, mockAlerts, mockServers, serverProfiles } from '@/data/mockData'
import type {
  Alert,
  AresDataSource,
  ConnectionTestResult,
  MetricsSnapshot,
  NewServerInput,
  SeriesPoint,
  Server,
  TimeRange,
} from '@/types'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Jittered latency so loading states are exercised the way they will be in production. */
const latency = (min = 180, max = 420) => delay(min + Math.random() * (max - min))

let servers: Server[] = [...mockServers]
let alerts: Alert[] = [...mockAlerts]

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'server'
  )
}

export const mockService: AresDataSource = {
  source: 'mock',

  async listServers(): Promise<Server[]> {
    await latency()
    return servers.map((s) => ({ ...s }))
  },

  async getServer(id: string): Promise<Server | null> {
    await latency(120, 260)
    const found = servers.find((s) => s.id === id)
    return found ? { ...found } : null
  },

  async getMetrics(serverId: string): Promise<MetricsSnapshot> {
    await latency(160, 380)
    return buildSnapshot(serverId)
  },

  async getSeries(serverId: string, range: TimeRange): Promise<SeriesPoint[]> {
    await latency(140, 320)
    return buildSeries(serverId, range)
  },

  async listAlerts(): Promise<Alert[]> {
    await latency()
    return alerts.map((a) => ({ ...a }))
  },

  /**
   * Simulated handshake. Outcome is derived from the URL so the behaviour is
   * predictable while demoing: hosts containing "fail" are unreachable and
   * a token shorter than 8 characters is rejected.
   */
  async testConnection(agentUrl: string, token: string): Promise<ConnectionTestResult> {
    let parsed: URL
    try {
      parsed = new URL(agentUrl)
    } catch {
      return { ok: false, reason: 'invalid-url', message: 'Enter a full URL, including https://' }
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      return { ok: false, reason: 'invalid-url', message: 'Only http:// and https:// agents are supported.' }
    }

    await delay(1100 + Math.random() * 700)

    if (/fail|offline|unreachable/i.test(parsed.hostname)) {
      return {
        ok: false,
        reason: 'unreachable',
        message: `No ARES agent answered at ${parsed.host}. Check the tunnel is running.`,
      }
    }
    if (token.trim().length > 0 && token.trim().length < 8) {
      return { ok: false, reason: 'unauthorized', message: 'The agent rejected this token (401 Unauthorized).' }
    }

    return { ok: true, latencyMs: Math.round(24 + Math.random() * 90), version: '0.1.0' }
  },

  async addServer(input: NewServerInput): Promise<Server> {
    await latency(300, 600)
    const template = serverProfiles[1]
    const base = buildServer(template)
    const id = slugify(input.name)
    const server: Server = {
      ...base,
      id: servers.some((s) => s.id === id) ? `${id}-${servers.length + 1}` : id,
      name: input.name.trim(),
      hostname: slugify(input.name),
      agentUrl: input.agentUrl.trim(),
      region: 'unassigned',
      tags: ['new'],
      status: 'online',
    }
    servers = [...servers, server]
    return { ...server }
  },

  async removeServer(id: string): Promise<void> {
    await latency(180, 320)
    servers = servers.filter((s) => s.id !== id)
    alerts = alerts.filter((a) => a.serverId !== id)
  },

  async restartAgent(serverId: string): Promise<void> {
    await delay(1400)
    const target = servers.find((s) => s.id === serverId)
    if (!target) throw new Error(`Unknown server "${serverId}"`)
  },
}
