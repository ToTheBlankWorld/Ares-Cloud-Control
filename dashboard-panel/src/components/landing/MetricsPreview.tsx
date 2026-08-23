import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { StatusDot } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { CHART_COLORS, MetricChart, type ChartSeries } from '@/components/dashboard/MetricChart'
import { buildSeries, mockServers } from '@/data/mockData'
import { formatBitrate, formatPercent } from '@/lib/format'

const CPU_SERIES: ChartSeries[] = [
  { key: 'cpu', label: 'CPU', color: CHART_COLORS.primary, format: (v) => formatPercent(v, 1) },
]
const NET_SERIES: ChartSeries[] = [
  { key: 'rx', label: 'Received', color: CHART_COLORS.primary, format: (v) => formatBitrate(v) },
  { key: 'tx', label: 'Transmitted', color: CHART_COLORS.secondary, format: (v) => formatBitrate(v) },
]

/** A live slice of the real console, rendered with the same components. */
export function MetricsPreview() {
  const server = mockServers[0]
  const series = useMemo(() => buildSeries(server.id, '1h'), [server.id])

  return (
    <Card flush className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot status="online" />
          <span className="truncate text-meta font-medium text-fg">{server.name}</span>
          <span className="hidden truncate text-micro text-fg-subtle sm:inline">{server.os}</span>
        </div>
        <span className="shrink-0 text-micro text-fg-subtle">Last hour</span>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-line-subtle bg-line-subtle lg:grid-cols-4">
        {[
          { label: 'CPU', value: server.cpu.usagePercent.toFixed(2), unit: '%' },
          { label: 'Memory', value: server.memory.usagePercent.toFixed(1), unit: '%' },
          { label: 'Network', value: (server.network.rxBytesPerSec / 1024).toFixed(1), unit: 'KB/s' },
          { label: 'Load', value: server.cpu.loadOne.toFixed(2), unit: '' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface px-4 py-3">
            <p className="label uppercase">{stat.label}</p>
            <p className="mt-1.5 text-metric font-semibold text-fg tnum">
              {stat.value}
              {stat.unit && <span className="ml-1 text-meta text-fg-subtle">{stat.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 divide-y divide-line-subtle lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <div className="p-4 lg:col-span-2">
          <p className="label uppercase">CPU utilisation</p>
          <MetricChart data={series} series={CPU_SERIES} yDomain={[0, 100]} height={170} className="mt-2" />
        </div>
        <div className="p-4">
          <p className="label uppercase">Network</p>
          <MetricChart data={series} series={NET_SERIES} height={170} showAxes={false} className="mt-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 border-t border-line px-4 py-3 sm:grid-cols-3">
        {[
          { label: 'Memory', percent: server.memory.usagePercent },
          { label: 'Disk', percent: server.disk.usagePercent },
          { label: 'Swap', percent: 4.2 },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex items-baseline justify-between">
              <span className="label uppercase">{item.label}</span>
              <span className="text-micro text-fg-muted tnum">{item.percent.toFixed(1)}%</span>
            </div>
            <Progress value={item.percent} className="mt-1.5" />
          </div>
        ))}
      </div>
    </Card>
  )
}
