import { memo } from 'react'
import { Card, CardHeader, FieldLabel } from '@/components/ui/Card'
import { Progress, RadialGauge } from '@/components/ui/Progress'
import { formatBytes, formatFrequency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { GpuMetrics } from '@/types'

interface GpuPanelProps {
  gpu: GpuMetrics
  className?: string
}

function GpuPanelComponent({ gpu, className }: GpuPanelProps) {
  if (!gpu.available || !gpu.devices || gpu.devices.length === 0) {
    return (
      <Card className={cn('flex flex-col', className)}>
        <CardHeader title="GPU" description="No accelerator detected" />
        <p className="py-8 text-center text-meta text-fg-muted">
          The agent found no NVIDIA device on this host. The GPU collector stays idle.
        </p>
      </Card>
    )
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title="GPU"
        description={`${gpu.devices.length} accelerator${gpu.devices.length > 1 ? 's' : ''}`}
      />

      <div className="mt-4 space-y-5">
        {gpu.devices.map((device) => {
          const memoryPercent =
            device.memory_total_bytes > 0 ? (device.memory_used_bytes / device.memory_total_bytes) * 100 : 0
          const powerPercent =
            device.power_limit_watts > 0 ? (device.power_usage_watts / device.power_limit_watts) * 100 : 0

          return (
            <div key={device.index}>
              <div className="flex flex-wrap items-center gap-4">
                <RadialGauge value={device.utilization_percent} size={72} strokeWidth={4}>
                  <span className="text-heading font-semibold text-fg tnum">
                    {Math.round(device.utilization_percent)}%
                  </span>
                </RadialGauge>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-meta font-medium text-fg">{device.name}</p>
                  <p className="mt-0.5 truncate text-micro text-fg-subtle tnum">
                    {formatFrequency(device.gpu_clock_mhz)} core · {formatFrequency(device.memory_clock_mhz)} memory
                  </p>

                  <div className="mt-3 space-y-2.5">
                    <div>
                      <div className="flex items-baseline justify-between">
                        <FieldLabel>VRAM</FieldLabel>
                        <span className="text-micro text-fg-muted tnum">
                          {formatBytes(device.memory_used_bytes)} of {formatBytes(device.memory_total_bytes)}
                        </span>
                      </div>
                      <Progress value={memoryPercent} className="mt-1.5" />
                    </div>
                    <div>
                      <div className="flex items-baseline justify-between">
                        <FieldLabel>Power</FieldLabel>
                        <span className="text-micro text-fg-muted tnum">
                          {device.power_usage_watts.toFixed(0)} W of {device.power_limit_watts} W
                        </span>
                      </div>
                      <Progress value={powerPercent} className="mt-1.5" semantic={false} />
                    </div>
                  </div>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-4 border-t border-line pt-3">
                {[
                  { label: 'Temperature', value: `${device.temperature_celsius}°C` },
                  { label: 'Fan', value: `${device.fan_speed_percent}%` },
                  { label: 'Free VRAM', value: formatBytes(device.memory_free_bytes) },
                ].map((item) => (
                  <div key={item.label}>
                    <FieldLabel>{item.label}</FieldLabel>
                    <dd className="mt-1 text-meta text-fg tnum">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export const GpuPanel = memo(GpuPanelComponent)
