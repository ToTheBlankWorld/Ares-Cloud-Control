import { memo } from 'react'
import { Card, CardHeader, FieldLabel } from '@/components/ui/Card'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatFrequency, severityFill, severityFor } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CpuMetrics } from '@/types'

interface CpuPanelProps {
  cpu: CpuMetrics
  className?: string
}

function LoadFigure({ label, value, cores }: { label: string; value: number; cores: number }) {
  const saturation = cores > 0 ? (value / cores) * 100 : 0
  const severity = severityFor(saturation)
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p
        className={cn(
          'mt-1 text-heading font-medium tnum',
          severity === 'critical' ? 'text-danger' : severity === 'warn' ? 'text-warning' : 'text-fg',
        )}
      >
        {value.toFixed(2)}
      </p>
    </div>
  )
}

function CpuPanelComponent({ cpu, className }: CpuPanelProps) {
  const hasCores = cpu.cores.length > 0

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader title="Processor" description={`${cpu.core_count} cores · ${cpu.thread_count} threads`} />

      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <FieldLabel>Total usage</FieldLabel>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-metric-lg font-semibold text-fg tnum">
              {cpu.total_usage_percent.toFixed(2)}
            </span>
            <span className="text-heading text-fg-subtle">%</span>
          </div>
        </div>
        <div className="flex gap-6">
          <LoadFigure label="Load 1m" value={cpu.load_average.one} cores={cpu.core_count} />
          <LoadFigure label="Load 5m" value={cpu.load_average.five} cores={cpu.core_count} />
          <LoadFigure label="Load 15m" value={cpu.load_average.fifteen} cores={cpu.core_count} />
        </div>
      </div>

      {hasCores ? (
        <div className="mt-5 border-t border-line pt-4">
          <FieldLabel className="mb-2.5">Per-core utilisation</FieldLabel>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {cpu.cores.map((core) => (
              <Tooltip
                key={core.id}
                side="top"
                triggerClassName="w-full"
                content={
                  <span className="tnum">
                    CPU {core.id} · {formatFrequency(core.frequency_mhz)}
                    {core.temperature_celsius !== null && ` · ${core.temperature_celsius}°C`}
                  </span>
                }
              >
                <div className="flex w-full items-center gap-2.5">
                  <span className="w-11 shrink-0 text-micro text-fg-subtle tnum">cpu{core.id}</span>
                  <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-active">
                    <div
                      className="h-full rounded-full transition-[width] duration-300 ease-out"
                      style={{
                        width: `${Math.max(1.5, core.usage_percent)}%`,
                        background: severityFill[severityFor(core.usage_percent)],
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-micro text-fg-muted tnum">
                    {Math.round(core.usage_percent)}%
                  </span>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-5 border-t border-line pt-4 text-meta text-fg-muted">
          Per-core telemetry is unavailable while the agent is offline.
        </p>
      )}
    </Card>
  )
}

export const CpuPanel = memo(CpuPanelComponent)
