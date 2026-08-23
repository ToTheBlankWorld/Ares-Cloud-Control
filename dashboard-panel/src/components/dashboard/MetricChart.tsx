import { memo, useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatClock } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SeriesPoint } from '@/types'

export interface ChartSeries {
  key: string
  label: string
  color: string
  /** Formats the value in the tooltip and on the Y axis. */
  format: (value: number) => string
}

interface MetricChartProps {
  data: SeriesPoint[]
  series: ChartSeries[]
  height?: number
  className?: string
  variant?: 'area' | 'line'
  /** Fixes the Y domain — useful for percentage charts. */
  yDomain?: [number, number]
  showGrid?: boolean
  showAxes?: boolean
}

/**
 * Chart palette.
 *
 * The primary series is always the accent. Secondary series step down through
 * neutrals rather than picking a new hue, so a two-line chart reads as one
 * measurement with a comparison instead of two unrelated things.
 */
export const CHART_COLORS = {
  primary: 'var(--color-accent)',
  secondary: 'var(--color-fg-subtle)',
  tertiary: 'var(--color-line-strong)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  success: 'var(--color-success)',
} as const

const AXIS = {
  stroke: 'var(--color-line)',
  tick: { fill: 'var(--color-fg-subtle)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

/** Short enough to feel like a redraw, not a performance. */
const ANIMATION_MS = 350

interface TooltipPayloadEntry {
  dataKey?: string | number
  value?: number
}

interface ChartTooltipProps {
  active?: boolean
  label?: number
  payload?: TooltipPayloadEntry[]
  series: ChartSeries[]
}

function ChartTooltip({ active, label, payload, series }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-line bg-elevated px-2.5 py-2 shadow-popover">
      <p className="text-micro text-fg-subtle tnum">{typeof label === 'number' ? formatClock(label) : ''}</p>
      <ul className="mt-1.5 space-y-1">
        {payload.map((entry) => {
          const definition = series.find((s) => s.key === entry.dataKey)
          if (!definition) return null
          return (
            <li key={definition.key} className="flex items-center gap-3 text-micro">
              <span className="size-1.5 shrink-0 rounded-full" style={{ background: definition.color }} />
              <span className="text-fg-muted">{definition.label}</span>
              <span className="ml-auto font-medium text-fg tnum">{definition.format(entry.value ?? 0)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MetricChartComponent({
  data,
  series,
  height = 200,
  className,
  variant = 'area',
  yDomain,
  showGrid = true,
  showAxes = true,
}: MetricChartProps) {
  const gradientId = useId().replace(/:/g, '')
  const primary = series[0]
  const margin = { top: 4, right: 4, bottom: 0, left: showAxes ? -18 : -60 }

  const axes = (
    <>
      {showGrid && <CartesianGrid stroke="var(--color-line-subtle)" vertical={false} />}
      <XAxis
        dataKey="t"
        type="number"
        domain={['dataMin', 'dataMax']}
        tickFormatter={(value: number) => formatClock(value)}
        minTickGap={52}
        tickMargin={8}
        hide={!showAxes}
        {...AXIS}
      />
      <YAxis
        domain={yDomain ?? ['auto', 'auto']}
        tickFormatter={(value: number) => primary.format(value)}
        width={52}
        tickCount={4}
        hide={!showAxes}
        {...AXIS}
      />
      <Tooltip
        cursor={{ stroke: 'var(--color-line-strong)', strokeWidth: 1 }}
        content={<ChartTooltip series={series} />}
      />
    </>
  )

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {variant === 'area' ? (
          <AreaChart data={data} margin={margin}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`${gradientId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {axes}
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={1.25}
                fill={`url(#${gradientId}-${s.key})`}
                animationDuration={ANIMATION_MS}
                dot={false}
                activeDot={{ r: 2.5, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={data} margin={margin}>
            {axes}
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={1.25}
                dot={false}
                animationDuration={ANIMATION_MS}
                activeDot={{ r: 2.5, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Memoised: the parent re-renders on every hover and filter change, and a
 * Recharts subtree is expensive to reconcile for no reason.
 */
export const MetricChart = memo(MetricChartComponent)
