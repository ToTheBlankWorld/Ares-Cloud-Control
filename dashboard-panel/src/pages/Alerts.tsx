import { useMemo, useState } from 'react'
import { BellOff, Search } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/PageContainer'
import { AlertTimeline } from '@/components/alerts/AlertTimeline'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useAlerts } from '@/hooks/useAresData'
import { cn } from '@/lib/utils'
import type { Alert } from '@/types'

type Filter = 'all' | 'critical' | 'warning' | 'info' | 'resolved'

function matchesFilter(alert: Alert, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'resolved') return alert.status === 'resolved'
  return alert.severity === filter && alert.status !== 'resolved'
}

export function AlertsPage() {
  const { data, loading, refresh } = useAlerts()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const alerts = useMemo(
    () => [...(data ?? [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [data],
  )

  const counts = useMemo(
    () => ({
      all: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length,
      warning: alerts.filter((a) => a.severity === 'warning' && a.status !== 'resolved').length,
      info: alerts.filter((a) => a.severity === 'info' && a.status !== 'resolved').length,
      resolved: alerts.filter((a) => a.status === 'resolved').length,
    }),
    [alerts],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return alerts.filter((alert) => {
      if (!matchesFilter(alert, filter)) return false
      if (!needle) return true
      return (
        alert.title.toLowerCase().includes(needle) ||
        alert.description.toLowerCase().includes(needle) ||
        alert.serverName.toLowerCase().includes(needle) ||
        alert.metric.toLowerCase().includes(needle)
      )
    })
  }, [alerts, filter, query])

  /* Severity summary: a single row of figures, coloured only when non-zero. */
  const summary = [
    { key: 'critical', label: 'Critical', value: counts.critical, tone: 'text-danger' },
    { key: 'warning', label: 'Warning', value: counts.warning, tone: 'text-warning' },
    { key: 'info', label: 'Info', value: counts.info, tone: 'text-accent' },
    { key: 'resolved', label: 'Resolved', value: counts.resolved, tone: 'text-success' },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Alerts"
        description="Threshold breaches and lifecycle events across every connected machine."
        actions={
          <Button variant="ghost" onClick={refresh}>
            Refresh
          </Button>
        }
      />

      <Card flush className="mt-5 overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-line-subtle sm:grid-cols-4">
          {summary.map((item) => (
            <div key={item.key} className="bg-surface px-4 py-3">
              <p className="label uppercase">{item.label}</p>
              <p
                className={cn(
                  'mt-1.5 text-metric font-semibold tnum',
                  item.value > 0 ? item.tone : 'text-fg-subtle',
                )}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs<Filter>
          value={filter}
          onChange={setFilter}
          className="min-w-0 flex-1 overflow-x-auto no-scrollbar"
          items={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'critical', label: 'Critical', count: counts.critical },
            { value: 'warning', label: 'Warning', count: counts.warning },
            { value: 'info', label: 'Info', count: counts.info },
            { value: 'resolved', label: 'Resolved', count: counts.resolved },
          ]}
        />
        <div className="relative lg:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search alerts"
            aria-label="Search alerts"
            className="pl-8"
          />
        </div>
      </div>

      <div className="mt-5">
        {loading && alerts.length === 0 ? (
          <Card flush>
            <SkeletonRows rows={6} />
          </Card>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<BellOff className="size-4" />}
            title={alerts.length === 0 ? 'No alerts recorded' : 'Nothing in this view'}
            description={
              alerts.length === 0
                ? 'Alerts appear here as soon as a metric crosses one of your configured thresholds.'
                : 'No alerts match this filter. Try another severity or clear the search.'
            }
            action={
              alerts.length > 0 && (
                <Button
                  onClick={() => {
                    setFilter('all')
                    setQuery('')
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <AlertTimeline alerts={visible} />
        )}
      </div>
    </PageContainer>
  )
}
