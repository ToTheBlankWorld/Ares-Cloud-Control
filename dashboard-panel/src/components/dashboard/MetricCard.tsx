import { memo, type ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Counter } from '@/components/ui/Counter'
import { Sparkline } from '@/components/dashboard/Sparkline'
import { severityFor } from '@/lib/format'
import { cn } from '@/lib/utils'

interface TrendProps {
  /** Percentage change against the previous window. */
  value: number
  /** When true a rising value is bad (CPU, memory). When false, rising is good. */
  higherIsWorse?: boolean
}

/**
 * Delta indicator. Grey by default — a 2% change is information, not an alarm,
 * so it only takes colour when the direction is genuinely unwelcome.
 */
function Trend({ value, higherIsWorse = true }: TrendProps) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) {
    return <span className="text-micro text-fg-subtle">no change</span>
  }
  const rising = value > 0
  const bad = higherIsWorse ? rising : !rising
  const Icon = rising ? ArrowUp : ArrowDown

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-micro tnum',
        bad && Math.abs(value) >= 10 ? 'text-warning' : 'text-fg-subtle',
      )}
    >
      <Icon className="size-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

interface MetricTileProps {
  label: string
  value: number
  decimals?: number
  unit?: string
  /** Small piece of supporting context — a total, a count, a source. */
  context?: ReactNode
  trend?: number
  higherIsWorse?: boolean
  /** Drives the severity marker from the shared ok/warn/critical thresholds. */
  severityValue?: number
  className?: string
}

/**
 * Compact readout for the KPI strip. No icon, no border of its own, no
 * per-metric colour — these live inside one shared panel divided by hairlines,
 * which reads as an instrument cluster rather than six competing cards.
 */
function MetricTileComponent({
  label,
  value,
  decimals = 1,
  unit,
  context,
  trend,
  higherIsWorse = true,
  severityValue,
  className,
}: MetricTileProps) {
  const severity = severityValue === undefined ? 'ok' : severityFor(severityValue)

  return (
    <div className={cn('min-w-0 px-4 py-3', className)}>
      <div className="flex items-center gap-1.5">
        <span className="label uppercase">{label}</span>
        {severity !== 'ok' && (
          <span
            className={cn('size-1.5 rounded-full', severity === 'critical' ? 'bg-danger' : 'bg-warning')}
            aria-label={severity === 'critical' ? 'Critical' : 'Warning'}
          />
        )}
      </div>

      <div className="mt-1.5 flex items-baseline gap-1">
        <Counter
          value={value}
          decimals={decimals}
          className={cn(
            'text-metric font-semibold',
            severity === 'critical' ? 'text-danger' : severity === 'warn' ? 'text-warning' : 'text-fg',
          )}
        />
        {unit && <span className="text-meta text-fg-subtle">{unit}</span>}
      </div>

      <div className="mt-1 flex items-center gap-2 truncate">
        {trend !== undefined && <Trend value={trend} higherIsWorse={higherIsWorse} />}
        {context && <span className="truncate text-micro text-fg-subtle">{context}</span>}
      </div>
    </div>
  )
}

export const MetricTile = memo(MetricTileComponent)

interface LeadMetricProps {
  label: string
  value: number
  decimals?: number
  unit?: string
  context?: ReactNode
  trend?: number
  severityValue?: number
  series?: number[]
  footer?: ReactNode
  className?: string
}

/**
 * The headline metric. Larger type and a sparkline give the overview a clear
 * entry point — previously every card had identical weight, so the eye had
 * nowhere to land.
 */
function LeadMetricComponent({
  label,
  value,
  decimals = 2,
  unit,
  context,
  trend,
  severityValue,
  series,
  footer,
  className,
}: LeadMetricProps) {
  const severity = severityValue === undefined ? 'ok' : severityFor(severityValue)

  return (
    <div className={cn('flex min-w-0 flex-col px-4 py-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="label uppercase">{label}</span>
        {trend !== undefined && <Trend value={trend} />}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <Counter
          value={value}
          decimals={decimals}
          className={cn(
            'text-metric-lg font-semibold',
            severity === 'critical' ? 'text-danger' : severity === 'warn' ? 'text-warning' : 'text-fg',
          )}
        />
        {unit && <span className="text-heading text-fg-subtle">{unit}</span>}
      </div>

      {context && <p className="mt-1 truncate text-micro text-fg-subtle">{context}</p>}

      {series && series.length > 1 && (
        <div className="mt-3 -mb-1 flex-1">
          <Sparkline data={series} height={40} />
        </div>
      )}

      {footer && <div className="mt-3 border-t border-line-subtle pt-2.5">{footer}</div>}
    </div>
  )
}

export const LeadMetric = memo(LeadMetricComponent)
