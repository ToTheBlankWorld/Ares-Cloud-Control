import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { ServerStatus } from '@/types'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

/**
 * Badges are flat: a tinted background, no border glow, no uppercase shouting.
 * Tone is only set when the state actually matters.
 */
const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-active text-fg-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-micro font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const STATUS_DOT: Record<ServerStatus, string> = {
  online: 'bg-success',
  degraded: 'bg-warning',
  offline: 'bg-danger',
}

const STATUS_TONE: Record<ServerStatus, BadgeTone> = {
  online: 'success',
  degraded: 'warning',
  offline: 'danger',
}

const STATUS_LABEL: Record<ServerStatus, string> = {
  online: 'Online',
  degraded: 'Degraded',
  offline: 'Offline',
}

/**
 * A 6px status dot. Only the healthy state breathes, and slowly — it is the
 * single piece of ambient motion in the product.
 */
export function StatusDot({
  status,
  className,
  live = true,
}: {
  status: ServerStatus
  className?: string
  live?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-block size-1.5 shrink-0 rounded-full',
        STATUS_DOT[status],
        status === 'online' && live && 'animate-live',
        className,
      )}
      aria-hidden
    />
  )
}

export function StatusBadge({ status, className }: { status: ServerStatus; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status]} className={className}>
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
    </Badge>
  )
}

/** Status shown as a dot plus plain text — for dense table rows. */
export function StatusText({ status, className }: { status: ServerStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-meta text-fg-muted', className)}>
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
    </span>
  )
}
