import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Copy, MoreHorizontal, RotateCw, Settings as SettingsIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { CpuPanel } from '@/components/server/CpuPanel'
import { MemoryPanel } from '@/components/server/MemoryPanel'
import { DiskPanel } from '@/components/server/DiskPanel'
import { NetworkPanel } from '@/components/server/NetworkPanel'
import { ProcessTable } from '@/components/server/ProcessTable'
import { SystemInfoPanel } from '@/components/server/SystemInfoPanel'
import { TemperaturePanel } from '@/components/server/TemperaturePanel'
import { GpuPanel } from '@/components/server/GpuPanel'
import { CHART_COLORS, MetricChart, type ChartSeries } from '@/components/dashboard/MetricChart'
import { TimeRangeControl } from '@/components/dashboard/TimeRangeControl'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusText } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { ErrorState } from '@/components/ui/States'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { IconMenu } from '@/components/ui/IconMenu'
import { useToast } from '@/components/ui/toast-context'
import { useMetrics, useSeries, useServer } from '@/hooks/useAresData'
import { dataSource } from '@/services'
import { formatBitrate, formatPercent, formatUptime } from '@/lib/format'
import type { TimeRange } from '@/types'

type PanelKey = 'overview' | 'processes' | 'storage' | 'network' | 'system'

const PANEL_TABS: { value: PanelKey; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'processes', label: 'Processes' },
  { value: 'storage', label: 'Storage' },
  { value: 'network', label: 'Network' },
  { value: 'system', label: 'System' },
]

const CPU_SERIES: ChartSeries[] = [
  { key: 'cpu', label: 'CPU', color: CHART_COLORS.primary, format: (v) => formatPercent(v, 1) },
]
const LOAD_SERIES: ChartSeries[] = [
  { key: 'load1', label: '1 min', color: CHART_COLORS.primary, format: (v) => v.toFixed(2) },
  { key: 'load5', label: '5 min', color: CHART_COLORS.secondary, format: (v) => v.toFixed(2) },
  { key: 'load15', label: '15 min', color: CHART_COLORS.tertiary, format: (v) => v.toFixed(2) },
]
const NETWORK_SERIES: ChartSeries[] = [
  { key: 'rx', label: 'Received', color: CHART_COLORS.primary, format: (v) => formatBitrate(v) },
  { key: 'tx', label: 'Transmitted', color: CHART_COLORS.secondary, format: (v) => formatBitrate(v) },
]
const DISK_SERIES: ChartSeries[] = [
  { key: 'diskRead', label: 'Read', color: CHART_COLORS.primary, format: (v) => formatBitrate(v) },
  { key: 'diskWrite', label: 'Write', color: CHART_COLORS.secondary, format: (v) => formatBitrate(v) },
]

export function ServerDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { push } = useToast()

  const { data: server, loading: serverLoading } = useServer(id)
  const { data: snapshot, loading: metricsLoading, refresh } = useMetrics(id)
  const [range, setRange] = useState<TimeRange>('1h')
  const { data: series } = useSeries(id, range)
  const [restarting, setRestarting] = useState(false)

  const requested = searchParams.get('panel') as PanelKey | null
  const panel: PanelKey = PANEL_TABS.some((tab) => tab.value === requested) ? requested! : 'overview'

  const setPanel = useCallback(
    (value: PanelKey) => {
      const next = new URLSearchParams(searchParams)
      if (value === 'overview') next.delete('panel')
      else next.set('panel', value)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const offline = server?.status === 'offline'

  const restartAgent = useCallback(async () => {
    if (!id) return
    setRestarting(true)
    try {
      await dataSource().restartAgent(id)
      push({ tone: 'success', title: 'Agent restarted', description: 'Collectors reconnected and are reporting.' })
      refresh()
    } catch (error) {
      push({
        tone: 'error',
        title: 'Restart failed',
        description: error instanceof Error ? error.message : 'The agent did not acknowledge the request.',
      })
    } finally {
      setRestarting(false)
    }
  }, [id, push, refresh])

  const copyAgentUrl = useCallback(async () => {
    if (!server) return
    try {
      await navigator.clipboard.writeText(server.agentUrl)
      push({ tone: 'success', title: 'Agent URL copied' })
    } catch {
      push({ tone: 'warning', title: 'Clipboard unavailable', description: server.agentUrl })
    }
  }, [server, push])

  const headline = useMemo(() => {
    if (!snapshot) return null
    const memory = snapshot.memory.memory
    return [
      { label: 'CPU', value: formatPercent(snapshot.cpu.total_usage_percent, 2) },
      {
        label: 'Memory',
        value: formatPercent(memory.total_bytes > 0 ? (memory.used_bytes / memory.total_bytes) * 100 : 0, 1),
      },
      { label: 'Load 1m', value: snapshot.cpu.load_average.one.toFixed(2) },
      { label: 'Processes', value: String(snapshot.processes.length) },
    ]
  }, [snapshot])

  if (!serverLoading && !server) {
    return (
      <PageContainer>
        <ErrorState
          kind="connection-failed"
          detail={`No server is registered with the id "${id}". It may have been removed from the control plane.`}
          action={
            <Button icon={<ArrowLeft className="size-3.5" />} onClick={() => navigate('/servers')}>
              Back to servers
            </Button>
          }
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer wide>
      <header>
        <Link
          to="/servers"
          className="inline-flex items-center gap-1.5 text-micro text-fg-muted transition-colors duration-150 hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          All servers
        </Link>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            {server ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-display font-semibold text-fg">{server.name}</h1>
                  <StatusText status={server.status} />
                  {server.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-fg-muted">
                  <span className="font-mono text-micro">{server.hostname}</span>
                  <span>{server.os}</span>
                  <span>{server.region}</span>
                  <span>agent v{server.agentVersion}</span>
                  <span className="tnum">
                    up {server.status === 'offline' ? '—' : formatUptime(server.uptimeSeconds)}
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-80" />
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button icon={<RotateCw className="size-3.5" />} loading={restarting} onClick={restartAgent}>
              Restart agent
            </Button>
            <Button
              variant="ghost"
              icon={<SettingsIcon className="size-3.5" />}
              onClick={() => navigate('/settings?section=servers')}
            >
              Settings
            </Button>
            <IconMenu
              label="More actions"
              trigger={<MoreHorizontal className="size-4" />}
              items={[
                {
                  id: 'copy',
                  label: 'Copy agent URL',
                  icon: <Copy className="size-3.5" />,
                  onSelect: () => void copyAgentUrl(),
                },
                {
                  id: 'refresh',
                  label: 'Force refresh',
                  icon: <RotateCw className="size-3.5" />,
                  onSelect: refresh,
                },
              ]}
            />
          </div>
        </div>

        {headline && (
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-4">
            {headline.map((item) => (
              <div key={item.label}>
                <dt className="label uppercase">{item.label}</dt>
                <dd className="mt-1 text-metric font-semibold text-fg tnum">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      {offline && (
        <ErrorState
          kind="offline"
          compact
          className="mt-4"
          action={
            <Button size="sm" loading={restarting} onClick={restartAgent}>
              Reconnect
            </Button>
          }
        />
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs<PanelKey> items={PANEL_TABS} value={panel} onChange={setPanel} className="min-w-0 flex-1" />
        <TimeRangeControl value={range} onChange={setRange} />
      </div>

      {metricsLoading && !snapshot ? (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : !snapshot ? (
        <ErrorState kind="api-unavailable" className="mt-4" />
      ) : (
        <div className="mt-4">
          {panel === 'overview' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card className="xl:col-span-2">
                <CardHeader
                  title="CPU utilisation"
                  description={`${snapshot.cpu.core_count} cores · ${snapshot.cpu.thread_count} threads`}
                />
                <MetricChart data={series ?? []} series={CPU_SERIES} yDomain={[0, 100]} height={210} className="mt-4" />
              </Card>

              <CpuPanel cpu={snapshot.cpu} />
              <MemoryPanel memory={snapshot.memory} />

              <Card>
                <CardHeader title="Load average" description="Runnable processes per core" />
                <MetricChart data={series ?? []} series={LOAD_SERIES} variant="line" height={180} className="mt-4" />
              </Card>

              <Card>
                <CardHeader title="Disk I/O" description="Aggregate block device throughput" />
                <MetricChart data={series ?? []} series={DISK_SERIES} height={180} className="mt-4" />
              </Card>

              <TemperaturePanel temperature={snapshot.temperature} />
              <GpuPanel gpu={snapshot.gpu} />
            </div>
          )}

          {panel === 'processes' && <ProcessTable processes={snapshot.processes} />}

          {panel === 'storage' && (
            <div className="grid grid-cols-1 gap-4">
              <DiskPanel disk={snapshot.disk} />
              <Card>
                <CardHeader title="Disk I/O" description="Read and write throughput" />
                <MetricChart data={series ?? []} series={DISK_SERIES} height={200} className="mt-4" />
              </Card>
            </div>
          )}

          {panel === 'network' && (
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader title="Network throughput" description="Primary interface" />
                <MetricChart data={series ?? []} series={NETWORK_SERIES} height={200} className="mt-4" />
              </Card>
              <NetworkPanel network={snapshot.network} />
            </div>
          )}

          {panel === 'system' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SystemInfoPanel system={snapshot.system} />
              <TemperaturePanel temperature={snapshot.temperature} />
              <GpuPanel gpu={snapshot.gpu} className="xl:col-span-2" />
            </div>
          )}
        </div>
      )}
    </PageContainer>
  )
}
