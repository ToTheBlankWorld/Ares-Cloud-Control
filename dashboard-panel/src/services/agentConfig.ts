/**
 * Agent endpoint configuration.
 *
 * The agent is reached through a Cloudflare Tunnel whose hostname changes on
 * every restart, so the URL is never hardcoded. Resolution order:
 *
 *   1. runtime override saved from Settings -> Servers (localStorage)
 *   2. build-time environment (`VITE_AGENT_URL` / `VITE_AGENT_TOKEN`)
 *   3. nothing — the dashboard stays on mock data
 */

const STORAGE_KEY = 'ares.agent.config'

export interface AgentCredentials {
  baseUrl: string | null
  token: string | null
}

export type DataSourceMode = 'mock' | 'api'

interface StoredConfig {
  baseUrl?: string
  token?: string
  mode?: DataSourceMode
}

function readStore(): StoredConfig {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredConfig) : {}
  } catch {
    return {}
  }
}

function writeStore(next: StoredConfig): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable (private mode, blocked cookies) — stay on env defaults */
  }
}

const envUrl = (import.meta.env.VITE_AGENT_URL ?? '').trim()
const envToken = (import.meta.env.VITE_AGENT_TOKEN ?? '').trim()
const envMode = (import.meta.env.VITE_DATA_SOURCE ?? 'mock').trim() as DataSourceMode

export function getAgentCredentials(): AgentCredentials {
  const stored = readStore()
  return {
    baseUrl: stored.baseUrl?.trim() || envUrl || null,
    token: stored.token?.trim() || envToken || null,
  }
}

function normaliseToOrigin(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return url.replace(/\/+$/, '')
  }
}

export function setAgentCredentials(baseUrl: string, token: string): void {
  writeStore({ ...readStore(), baseUrl: normaliseToOrigin(baseUrl.trim()), token: token.trim() })
}

/** Which data source the app boots with. Falls back to mock whenever no URL is known. */
export function getDataSourceMode(): DataSourceMode {
  const stored = readStore()
  const mode = stored.mode ?? (envMode === 'api' ? 'api' : 'mock')
  if (mode === 'api' && !getAgentCredentials().baseUrl) return 'mock'
  return mode
}

export function setDataSourceMode(mode: DataSourceMode): void {
  writeStore({ ...readStore(), mode })
}

export function clearAgentConfig(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
