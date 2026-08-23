import { memo } from 'react'
import { Card, CardHeader, FieldLabel } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MemoryMetrics } from '@/types'

interface MemoryPanelProps {
  memory: MemoryMetrics
  className?: string
}

/**
 * Memory composition.
 *
 * Used is the accent, cache is a neutral step down and free is the empty
 * track — the three segments are the same measurement, so they share a hue
 * rather than each getting their own.
 */
const SEGMENT_COLORS = {
  used: 'var(--color-accent)',
  cached: 'var(--color-accent-strong)',
  free: 'var(--color-surface-active)',
} as const

function MemoryPanelComponent({ memory, className }: MemoryPanelProps) {
  const { total_bytes: total, used_bytes: used, available_bytes: available, free_bytes: free, cached_bytes: cached } =
    memory.memory
  const usedPercent = total > 0 ? (used / total) * 100 : 0

  const segments = [
    { key: 'used', label: 'Used', bytes: used, color: SEGMENT_COLORS.used },
    { key: 'cached', label: 'Cached', bytes: cached, color: SEGMENT_COLORS.cached },
    { key: 'free', label: 'Free', bytes: free, color: SEGMENT_COLORS.free },
  ]

  const swapPercent = memory.swap.total_bytes > 0 ? (memory.swap.used_bytes / memory.swap.total_bytes) * 100 : 0

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader title="Memory" description={`${formatBytes(total)} installed`} />

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-metric-lg font-semibold text-fg tnum">{usedPercent.toFixed(1)}</span>
        <span className="text-heading text-fg-subtle">%</span>
        <span className="ml-1.5 text-meta text-fg-subtle tnum">
          {formatBytes(used)} of {formatBytes(total)}
        </span>
      </div>

      {/* Stacked composition bar: used | cached | free */}
      <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-surface-active">
        {segments.map((segment, index) => {
          const percent = total > 0 ? (segment.bytes / total) * 100 : 0
          if (percent <= 0) return null
          return (
            <div
              key={segment.key}
              className={cn('h-full transition-[width] duration-300 ease-out', index > 0 && 'border-l border-surface')}
              style={{ width: `${percent}%`, background: segment.color }}
            />
          )
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-xs" style={{ background: segment.color }} aria-hidden />
            <span className="text-micro text-fg-muted">{segment.label}</span>
            <span className="text-micro text-fg tnum">{formatBytes(segment.bytes)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: formatBytes(total) },
          { label: 'Used', value: formatBytes(used) },
          { label: 'Available', value: formatBytes(available) },
          { label: 'Cached', value: formatBytes(cached) },
        ].map((item) => (
          <div key={item.label}>
            <FieldLabel>{item.label}</FieldLabel>
            <dd className="mt-1 text-meta text-fg tnum">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 border-t border-line pt-4">
        <div className="flex items-baseline justify-between">
          <FieldLabel>Swap</FieldLabel>
          <span className="text-micro text-fg-muted tnum">
            {formatBytes(memory.swap.used_bytes)} of {formatBytes(memory.swap.total_bytes)}
          </span>
        </div>
        <Progress value={swapPercent} className="mt-2" />
      </div>
    </Card>
  )
}

export const MemoryPanel = memo(MemoryPanelComponent)
