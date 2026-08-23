import { memo } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Alert, AlertSeverity } from '@/types'

/**
 * Severity is carried by a left rule and one word of text. No glowing badge,
 * no tinted panel — at a glance you read the colour of the rule, and when you
 * look properly the text says the same thing.
 */
const SEVERITY_RULE: Record<AlertSeverity, string> = {
  critical: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-accent',
}

const SEVERITY_TEXT: Record<AlertSeverity, string> = {
  critical: 'text-danger',
  warning: 'text-warning',
  info: 'text-accent',
}

interface AlertCardProps {
  alert: Alert
  className?: string
}

function AlertCardComponent({ alert, className }: AlertCardProps) {
  const resolved = alert.status === 'resolved'

  return (
    <article
      className={cn(
        'rounded-md border border-line border-l-2 bg-surface px-3.5 py-3 transition-colors duration-150 hover:bg-surface-hover',
        resolved ? 'border-l-line-strong' : SEVERITY_RULE[alert.severity],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-meta font-medium text-fg">{alert.title}</h3>
        <time
          dateTime={alert.timestamp}
          title={formatDateTime(alert.timestamp)}
          className="shrink-0 text-micro text-fg-subtle tnum"
        >
          {formatRelativeTime(alert.timestamp)}
        </time>
      </div>

      <p className="mt-1 text-meta leading-relaxed text-fg-muted">{alert.description}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro text-fg-subtle">
        <span className={cn('font-medium', resolved ? 'text-success' : SEVERITY_TEXT[alert.severity])}>
          {resolved ? 'Resolved' : alert.status === 'acknowledged' ? 'Acknowledged' : alert.severity}
        </span>
        <span className="text-line-strong">·</span>
        <Link
          to={`/servers/${alert.serverId}`}
          className="text-fg-muted transition-colors duration-150 hover:text-fg"
        >
          {alert.serverName}
        </Link>
        <span className="text-line-strong">·</span>
        <span className="font-mono">{alert.metric}</span>
        <span className="text-line-strong">·</span>
        <span className="tnum">
          {alert.value} (threshold {alert.threshold})
        </span>
      </div>
    </article>
  )
}

export const AlertCard = memo(AlertCardComponent)
