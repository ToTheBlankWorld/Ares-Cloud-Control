import { useCallback, useMemo, useState } from 'react'
import { LayoutGrid, Plus, Rows3, Search } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/PageContainer'
import { ServerCard } from '@/components/dashboard/ServerCard'
import { ServerTable, type ServerSortKey } from '@/components/servers/ServerTable'
import { AddServerModal } from '@/components/servers/AddServerModal'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { Input } from '@/components/ui/Field'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/States'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useServers } from '@/hooks/useAresData'
import type { Server, ServerStatus } from '@/types'

type StatusFilter = 'all' | ServerStatus
type ViewMode = 'table' | 'grid'

const SORT_ACCESSORS: Record<ServerSortKey, (server: Server) => string | number> = {
  name: (s) => s.name.toLowerCase(),
  status: (s) => s.status,
  cpu: (s) => s.cpu.usagePercent,
  memory: (s) => s.memory.usagePercent,
  disk: (s) => s.disk.usagePercent,
  uptime: (s) => s.uptimeSeconds,
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'online', label: 'Online' },
  { value: 'degraded', label: 'Degraded' },
  { value: 'offline', label: 'Offline' },
]

const VIEW_TABS = [
  { value: 'table' as const, label: 'Table', icon: <Rows3 className="size-3.5" /> },
  { value: 'grid' as const, label: 'Grid', icon: <LayoutGrid className="size-3.5" /> },
]

export function ServersPage() {
  const { data, loading } = useServers()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  // Table first: this is a fleet list, and a table is the denser, faster read.
  const [view, setView] = useState<ViewMode>('table')
  const [sortKey, setSortKey] = useState<ServerSortKey>('name')
  const [descending, setDescending] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const servers = useMemo(() => [...(data ?? [])], [data])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = servers.filter((server) => {
      if (status !== 'all' && server.status !== status) return false
      if (!needle) return true
      return (
        server.name.toLowerCase().includes(needle) ||
        server.hostname.toLowerCase().includes(needle) ||
        server.os.toLowerCase().includes(needle) ||
        server.region.toLowerCase().includes(needle) ||
        server.tags.some((tag) => tag.includes(needle))
      )
    })

    const accessor = SORT_ACCESSORS[sortKey]
    const direction = descending ? -1 : 1
    return filtered.sort((a, b) => {
      const left = accessor(a)
      const right = accessor(b)
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction
      return String(left).localeCompare(String(right)) * direction
    })
  }, [servers, query, status, sortKey, descending])

  const onSort = useCallback(
    (key: ServerSortKey) => {
      if (key === sortKey) setDescending((v) => !v)
      else {
        setSortKey(key)
        setDescending(false)
      }
    },
    [sortKey],
  )

  const onAdded = useCallback(() => {
    // Server is already persisted by the data source; listServers will pick it up on next load
    // The modal closes automatically, triggering a refresh via useServers
  }, [])
  const closeAdd = useCallback(() => setAddOpen(false), [])

  return (
    <PageContainer wide>
      <PageHeader
        title="Servers"
        description="Monitor every machine from one place."
        actions={
          <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setAddOpen(true)}>
            Add server
          </Button>
        }
      />

      <div className="mt-5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, host, OS, region or tag"
            aria-label="Search servers"
            className="pl-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Dropdown<StatusFilter> className="w-36" value={status} onChange={setStatus} items={STATUS_FILTERS} />
          <Tabs<ViewMode> variant="segmented" value={view} onChange={setView} items={VIEW_TABS} />
        </div>
      </div>

      <div className="mt-4">
        {loading && servers.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title={servers.length === 0 ? 'No servers connected' : 'No servers match this filter'}
            description={
              servers.length === 0
                ? 'Connect your first machine to begin monitoring your infrastructure.'
                : 'Try a different search term, or clear the status filter to see the whole fleet.'
            }
            action={
              servers.length === 0 ? (
                <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setAddOpen(true)}>
                  Add server
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setQuery('')
                    setStatus('all')
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : view === 'table' ? (
          <ServerTable servers={visible} sortKey={sortKey} descending={descending} onSort={onSort} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visible.map((server) => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        )}
      </div>

      <AddServerModal open={addOpen} onClose={closeAdd} onAdded={onAdded} />
    </PageContainer>
  )
}
