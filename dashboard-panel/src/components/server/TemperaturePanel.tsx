import { memo } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { TemperatureMetrics } from '@/types'

interface TemperaturePanelProps {
  temperature: TemperatureMetrics
  className?: string
}

/** Ratio of a reading to its critical point, expressed as a 0-100 severity input. */
function saturation(value: number, critical: number | null): number {
  return Math.min(100, (value / (critical ?? 100)) * 100)
}

function TemperaturePanelComponent({ temperature, className }: TemperaturePanelProps) {
  const sensors = temperature.sensors

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader title="Thermals" description={`${sensors.length} sensors`} />

      {sensors.length === 0 ? (
        <p className="py-8 text-center text-meta text-fg-muted">No thermal sensors reported.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sensors.map((sensor) => {
            const percent = saturation(sensor.temperature_celsius, sensor.critical_celsius)
            const hot = percent >= 85
            const warm = percent >= 65
            return (
              <li key={sensor.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-meta text-fg-muted">{sensor.label}</span>
                  <span
                    className={cn(
                      'text-meta font-medium tnum',
                      hot ? 'text-danger' : warm ? 'text-warning' : 'text-fg',
                    )}
                  >
                    {sensor.temperature_celsius}&deg;C
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-active">
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-300 ease-out',
                      hot ? 'bg-danger' : warm ? 'bg-warning' : 'bg-line-strong',
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export const TemperaturePanel = memo(TemperaturePanelComponent)
