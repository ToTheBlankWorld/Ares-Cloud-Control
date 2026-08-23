import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/PageContainer'
import { ServerOverview } from '@/components/dashboard/ServerOverview'
import { LeadMetric, MetricTile } from '@/components/dashboard/MetricCard'
import { ServerCard } from '@/components/dashboard/ServerCard'
import { CHART_COLORS, MetricChart, type ChartSeries } from '@/components/dashboard/MetricChart'
import { TimeRangeControl } from '@/components/dashboard/TimeRangeControl'
import { AlertCard } from '@/components/alerts/AlertCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { AddServerModal } from '@/components/servers/AddServerModal'
import { useAlerts, useMetrics, useSeries, useServers } from '@/hooks/useAresData'
import { formatBitrate, formatBytes, formatPercent } from '@/lib/format'
import { average } from '@/lib/utils'
import type { Server, TimeRange } from '@/types'

/* Series definitions live at module scope: they are stable references, so the
   memoised chart never re-renders because a prop identity changed. */
const CPU_SERIES: ChartSeries[] = [
  { key: 'cpu', label: 'CPU', color: CHART_COLORS.primary, format: (v) => formatPercent(v, 1) },
]
const MEMORY_SERIES: ChartSeries[] = [
  { key: 'memory', label: 'Memory', color: CHART_COLORS.primary, format: (v) => formatPercent(v, 1) },
  { key: 'swap', label: 'Swap', color: CHART_COLORS.secondary, format: (v) => formatPercent(v, 1) },
]
const NETWORK_SERIES: ChartSeries[] = [
  { key: 'rx', label: 'Received', color: CHART_COLORS.primary, format: (v) => formatBitrate(v) },
  { key: 'tx', label: 'Transmitted', color: CHART_COLORS.secondary, format: (v) => formatBitrate(v) },
]

export function DashboardPage() {
  const { data: serversData, loading: serversLoading, refresh } = useServers()
  const { data: alertsData } = useAlerts()
  const [range, setRange] = useState<TimeRange>('1h')
  const [addOpen, setAddOpen] = useState(false)
  const [extraServers, setExtraServers] = useState<Server[]>([])

  const servers = useMemo(() => [...(serversData ?? []), ...extraServers], [serversData, extraServers])
  const alerts = useMemo(() => alertsData ?? [], [alertsData])
  const primary = servers.find((s) => s.status === 'online') ?? servers[0]

  const { data: snapshot } = useMetrics(primary?.id)
  const { data: series } = useSeries(primary?.id, range)

  const online = useMemo(() => servers.filter((s) => s.status === 'online'), [servers])

  const aggregate = useMemo(() => {
    if (online.length === 0) return { cpu: 0, memory: 0, disk: 0, network: 0, load: 0, processes: 0 }
    return {
      cpu: average(online.map((s) => s.cpu.usagePercent)),
      memory: average(online.map((s) => s.memory.usagePercent)),
      disk: average(online.map((s) => s.disk.usagePercent)),
      network: online.reduce((acc, s) => acc + s.network.rxBytesPerSec + s.network.txBytesPerSec, 0),
      load: average(online.map((s) => s.cpu.loadOne)),
      processes: snapshot?.processes.length ?? 0,
    }
  }, [online, snapshot])

  /* Sparkline data is derived once per series change, not on every render. */
  const cpuSpark = useMemo(() => series?.map((p) => p.cpu), [series])

  const cpuTrend = useMemo(() => {
    if (!series || series.length < 4) return undefined
    const half = Math.floor(series.length / 2)
    const older = average(series.slice(0, half).map((p) => p.cpu))
    const recent = average(series.slice(half).map((p) => p.cpu))
    return older === 0 ? 0 : ((recent - older) / older) * 100
  }, [series])

  const activeAlerts = useMemo(() => alerts.filter((a) => a.status !== 'resolved'), [alerts])
  const onAdded = useCallback((server: Server) => setExtraServers((current) => [...current, server]), [])
  const closeAdd = useCallback(() => setAddOpen(false), [])

  return (
    <PageContainer wide>
      <PageHeader
        title="Overview"
        description="Fleet health and current load across every connected machine."
        meta={<ServerOverview servers={servers} alerts={alerts} />}
        actions={
          <>
            <Button variant="ghost" onClick={refresh}>
              Refresh
            </Button>
            <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setAddOpen(true)}>
              Add server
            </Button>
          </>
        }
      />

      {/*
        KPI cluster: one panel, hairline-divided. The lead metric spans two
        columns and carries a sparkline; the rest are compact readouts. This is
        the hierarchy that six identically-weighted cards did not have.
      */}
      <Card flush className="mt-5 overflow-hidden" aria-label="Fleet metrics">
        {/* gap-px over a hairline background draws the dividers, so the grid
            can reflow at any breakpoint without leaving dangling borders. */}
        <div className="grid grid-cols-2 gap-px bg-line-subtle sm:grid-cols-3 xl:grid-cols-7">
          <LeadMetric
            label="CPU"
            value={aggregate.cpu}
            decimals={2}
            unit="%"
            trend={cpuTrend}
            severityValue={aggregate.cpu}
            context={`Mean across ${online.length} host${online.length === 1 ? '' : 's'}`}
            series={cpuSpark}
            className="col-span-2 bg-surface"
          />
          <MetricTile
            label="Memory"
            value={aggregate.memory}
            unit="%"
            severityValue={aggregate.memory}
            context={snapshot ? formatBytes(snapshot.memory.memory.used_bytes) : undefined}
            className="bg-surface"
          />
          <MetricTile
            label="Storage"
            value={aggregate.disk}
            unit="%"
            severityValue={aggregate.disk}
            context="Root volumes"
            className="bg-surface"
          />
          <MetricTile
            label="Network"
            value={aggregate.network / 1024}
            unit="KB/s"
            higherIsWorse={false}
            context="Combined throughput"
            className="bg-surface"
          />
          <MetricTile
            label="Load"
            value={aggregate.load}
            decimals={2}
            context="1-minute average"
            className="bg-surface"
          />
          <MetricTile
            label="Processes"
            value={aggregate.processes}
            decimals={0}
            context={primary ? `on ${primary.name}` : 'No host'}
            className="bg-surface"
          />
        </div>
      </Card>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3" aria-label="Trends">
        <Card className="xl:col-span-2">
          <CardHeader
            title="CPU utilisation"
            description={primary ? `${primary.name} · ${primary.cpu.cores} cores` : 'No host selected'}
            actions={<TimeRangeControl value={range} onChange={setRange} />}
          />
          <MetricChart data={series ?? []} series={CPU_SERIES} yDomain={[0, 100]} height={220} className="mt-4" />
        </Card>

        <Card>
          <CardHeader title="Memory and swap" description="Percentage of installed memory" />
          <MetricChart data={series ?? []} series={MEMORY_SERIES} yDomain={[0, 100]} height={220} className="mt-4" />
        </Card>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3" aria-label="Network and alerts">
        <Card className="xl:col-span-2">
          <CardHeader title="Network throughput" description="Primary interface" />
          <MetricChart data={series ?? []} series={NETWORK_SERIES} height={200} className="mt-4" />
        </Card>

        <Card flush>
          <div className="px-4 py-3">
            <CardHeader
              title="Active alerts"
              description={`${activeAlerts.length} need attention`}
              actions={
                <Link
                  to="/alerts"
                  className="text-meta text-accent transition-colors duration-150 hover:text-accent-hover"
                >
                  View all
                </Link>
              }
            />
          </div>
          <div className="space-y-2 px-4 pb-4">
            {activeAlerts.length === 0 ? (
              <p className="py-10 text-center text-meta text-fg-muted">Everything is within thresholds.</p>
            ) : (
              activeAlerts.slice(0, 3).map((alert) => <AlertCard key={alert.id} alert={alert} />)
            )}
          </div>
        </Card>
      </section>

      <section className="mt-6" aria-label="Servers">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-title font-semibold text-fg">Infrastructure</h2>
            <p className="mt-0.5 text-meta text-fg-muted">
              {servers.length} machines · {online.length} reporting
            </p>
          </div>
          <Link
            to="/servers"
            className="text-meta text-accent transition-colors duration-150 hover:text-accent-hover"
          >
            Manage servers
          </Link>
        </div>

        {serversLoading && servers.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : servers.length === 0 ? (
          <EmptyState
            title="No servers connected"
            description="Connect your first machine to begin monitoring your infrastructure."
            action={
              <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setAddOpen(true)}>
                Add server
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {servers.map((server) => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        )}
      </section>

      <AddServerModal open={addOpen} onClose={closeAdd} onAdded={onAdded} />
    </PageContainer>
  )
}
