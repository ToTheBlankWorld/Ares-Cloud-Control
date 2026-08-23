import type { ReactNode } from 'react'
import { AlertOctagon, KeyRound, PlugZap, ServerCrash, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: ReactNode
  action?: ReactNode
  className?: string
}

/** Empty state: a dashed panel, one icon, no grid texture, no entrance motion. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex size-8 items-center justify-center rounded-md bg-surface-active text-fg-subtle">
        {icon ?? <PlugZap className="size-4" />}
      </div>
      <h3 className="mt-3 text-heading font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 max-w-sm text-meta leading-relaxed text-fg-muted">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export type ErrorKind = 'offline' | 'connection-failed' | 'invalid-token' | 'tunnel-unavailable' | 'api-unavailable'

const ERROR_PRESETS: Record<ErrorKind, { icon: ReactNode; title: string; description: string }> = {
  offline: {
    icon: <ServerCrash className="size-4" />,
    title: 'Server offline',
    description: 'The agent on this machine is not reporting. Metrics shown are from the last successful sync.',
  },
  'connection-failed': {
    icon: <WifiOff className="size-4" />,
    title: 'Connection failed',
    description: 'ARES could not reach the agent. Verify the URL and that the host is accepting connections.',
  },
  'invalid-token': {
    icon: <KeyRound className="size-4" />,
    title: 'Invalid token',
    description: 'The agent rejected the API token. Regenerate it on the host and update this connection.',
  },
  'tunnel-unavailable': {
    icon: <PlugZap className="size-4" />,
    title: 'Tunnel unavailable',
    description: 'The Cloudflare tunnel is down or its hostname rotated. Restart the tunnel and update the URL.',
  },
  'api-unavailable': {
    icon: <AlertOctagon className="size-4" />,
    title: 'API unavailable',
    description: 'The agent responded, but the metrics endpoint returned an error. Check the agent logs.',
  },
}

interface ErrorStateProps {
  kind: ErrorKind
  detail?: string
  action?: ReactNode
  className?: string
  compact?: boolean
}

/**
 * Error surface. A left rule in the status colour carries the severity —
 * a full tinted panel drowned out the data next to it.
 */
export function ErrorState({ kind, detail, action, className, compact = false }: ErrorStateProps) {
  const preset = ERROR_PRESETS[kind]

  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          'flex items-start gap-3 rounded-md border border-line border-l-2 border-l-danger bg-surface px-3 py-2.5',
          className,
        )}
      >
        <span className="mt-px shrink-0 text-danger">{preset.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-meta font-medium text-fg">{preset.title}</p>
          <p className="mt-0.5 text-micro leading-relaxed text-fg-muted">{detail ?? preset.description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex size-8 items-center justify-center rounded-md bg-danger-soft text-danger">
        {preset.icon}
      </div>
      <h3 className="mt-3 text-heading font-semibold text-fg">{preset.title}</h3>
      <p className="mt-1.5 max-w-md text-meta leading-relaxed text-fg-muted">{detail ?? preset.description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
