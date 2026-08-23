import { memo } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatDateTime, formatUptime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SystemInfo } from '@/types'

interface SystemInfoPanelProps {
  system: SystemInfo
  className?: string
}

/** Host identity as a definition list — label left, value right, hairline between. */
function SystemInfoPanelComponent({ system, className }: SystemInfoPanelProps) {
  const rows = [
    { label: 'Hostname', value: system.hostname, mono: true },
    { label: 'Operating system', value: system.os_version, mono: false },
    { label: 'Kernel', value: system.kernel_version, mono: true },
    { label: 'Architecture', value: system.architecture, mono: true },
    { label: 'Uptime', value: formatUptime(system.uptime_seconds), mono: false },
    { label: 'Booted', value: formatDateTime(system.boot_time), mono: false },
    { label: 'Agent version', value: system.agent_version, mono: true },
    { label: 'Last heartbeat', value: formatDateTime(system.server_timestamp), mono: false },
  ]

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader title="System" description="Host identity and agent state" />
      <dl className="mt-3 divide-y divide-line-subtle">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-2">
            <dt className="text-meta text-fg-muted">{row.label}</dt>
            <dd className={cn('truncate text-meta text-fg', row.mono && 'font-mono text-micro')}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

export const SystemInfoPanel = memo(SystemInfoPanelComponent)
