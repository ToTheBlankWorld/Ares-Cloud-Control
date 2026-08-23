import { memo } from 'react'
import { Counter } from '@/components/ui/Counter'
import { cn } from '@/lib/utils'
import type { Alert, Server } from '@/types'

interface ServerOverviewProps {
  servers: Server[]
  alerts: Alert[]
  className?: string
}

/**
 * Fleet status line under the page title.
 *
 * Reads as a sentence of numbers rather than four boxes: total is neutral,
 * and offline/critical only take colour when they are non-zero.
 */
function ServerOverviewComponent({ servers, alerts, className }: ServerOverviewProps) {
  const online = servers.filter((s) => s.status === 'online').length
  const offline = servers.length - online
  const critical = alerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length

  const stats = [
    { label: 'servers', value: servers.length, tone: 'text-fg' },
    { label: 'online', value: online, tone: online > 0 ? 'text-success' : 'text-fg-subtle' },
    { label: 'offline', value: offline, tone: offline > 0 ? 'text-danger' : 'text-fg-subtle' },
    { label: 'critical alerts', value: critical, tone: critical > 0 ? 'text-danger' : 'text-fg-subtle' },
  ]

  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-6 gap-y-2', className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-baseline gap-1.5">
          <Counter value={stat.value} className={cn('text-heading font-semibold', stat.tone)} />
          <span className="text-meta text-fg-muted">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}

export const ServerOverview = memo(ServerOverviewComponent)
