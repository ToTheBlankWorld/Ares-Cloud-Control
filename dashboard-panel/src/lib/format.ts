/** Human-facing formatters. All output is deterministic and locale-independent. */

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const

export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1)
  const value = bytes / 1024 ** exponent
  const precision = exponent === 0 ? 0 : value >= 100 ? 1 : decimals
  return `${value.toFixed(precision)} ${BYTE_UNITS[exponent]}`
}

export function formatBitrate(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec, 1)}/s`
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** `13d 21h 42m` — compact, engineer-readable uptime. */
export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m ${Math.floor(seconds % 60)}s`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

/** `2m ago`, `4h ago`, `3d ago`. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const delta = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  if (delta < 45) return 'just now'
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`
  return `${Math.floor(delta / 86400)}d ago`
}

export function formatClock(value: number | string): string {
  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatFrequency(mhz: number): string {
  return mhz >= 1000 ? `${(mhz / 1000).toFixed(2)} GHz` : `${Math.round(mhz)} MHz`
}

/* ------------------------------------------------------------------
   Severity

   A metric is grey until it crosses a threshold. Colour is reserved for
   states that need a decision — that is the whole colour budget.
   ------------------------------------------------------------------ */

export type Severity = 'ok' | 'warn' | 'critical'

export function severityFor(percent: number, warn = 75, critical = 90): Severity {
  if (percent >= critical) return 'critical'
  if (percent >= warn) return 'warn'
  return 'ok'
}

/** Fill colour for bars and gauges. Nominal readings stay neutral. */
export const severityFill: Record<Severity, string> = {
  ok: 'var(--color-line-strong)',
  warn: 'var(--color-warning)',
  critical: 'var(--color-danger)',
}

/** Text colour for a severity. Nominal text stays in the normal ramp. */
export const severityText: Record<Severity, string> = {
  ok: 'text-fg',
  warn: 'text-warning',
  critical: 'text-danger',
}
