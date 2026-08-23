import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { severityFill, severityFor } from '@/lib/format'

interface ProgressProps {
  value: number
  max?: number
  className?: string
  /** Colours the fill from the shared ok/warn/critical thresholds. */
  semantic?: boolean
  color?: string
  height?: number
  label?: string
}

/**
 * Usage bar. Width animates through a CSS transition rather than a JS
 * animation loop, so a table of 200 rows costs nothing.
 */
export function Progress({
  value,
  max = 100,
  className,
  semantic = true,
  color,
  height = 3,
  label,
}: ProgressProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const fill = color ?? (semantic ? severityFill[severityFor(percent)] : 'var(--color-accent)')

  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-surface-active', className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-[width,background-color] duration-300 ease-out"
        style={{ width: `${percent}%`, background: fill }}
      />
    </div>
  )
}

interface RadialProps {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  children?: ReactNode
}

/** Circular gauge. Also CSS-transitioned, not animated per frame. */
export function RadialGauge({ value, size = 76, strokeWidth = 4, className, children }: RadialProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percent = Math.min(100, Math.max(0, value))
  const severity = severityFor(percent)

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-active)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={severity === 'ok' ? 'var(--color-accent)' : severityFill[severity]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          className="transition-[stroke-dashoffset,stroke] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
