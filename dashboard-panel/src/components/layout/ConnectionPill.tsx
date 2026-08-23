import { Tooltip } from '@/components/ui/Tooltip'
import { dataSource, getAgentCredentials } from '@/services'
import { cn } from '@/lib/utils'

interface ConnectionPillProps {
  collapsed?: boolean
  className?: string
}

/**
 * Data-source indicator.
 *
 * Reports what the dashboard is actually reading from. The previous version
 * ticked a fake latency number every four seconds, which re-rendered the whole
 * sidebar on a timer to display a value that meant nothing.
 */
export function ConnectionPill({ collapsed = false, className }: ConnectionPillProps) {
  const live = dataSource().source === 'api'
  const { baseUrl } = getAgentCredentials()

  const endpoint = live ? (baseUrl ?? 'not configured') : 'Sample telemetry'
  const title = live ? 'Agent connected' : 'Mock data'
  const detail = `${title} · ${endpoint}`

  if (collapsed) {
    return (
      <Tooltip content={detail} side="right" triggerClassName="w-full">
        <span className={cn('flex h-8 w-full items-center justify-center rounded-sm', className)}>
          <span
            className={cn('size-1.5 rounded-full', live ? 'animate-live bg-success' : 'bg-fg-subtle')}
            aria-hidden
          />
          <span className="sr-only">{detail}</span>
        </span>
      </Tooltip>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 rounded-sm px-2 py-1.5', className)}>
      <span
        className={cn('size-1.5 shrink-0 rounded-full', live ? 'animate-live bg-success' : 'bg-fg-subtle')}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-micro font-medium text-fg-muted">{title}</p>
        <p className="truncate text-micro text-fg-subtle">{endpoint}</p>
      </div>
    </div>
  )
}
