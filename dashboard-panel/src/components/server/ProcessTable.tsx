import { memo, useCallback, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Dropdown } from '@/components/ui/Dropdown'
import { Input } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { Table, TableBody, TableHead, TableScroll, Td, Th, Tr } from '@/components/ui/Table'
import { formatBytes, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Process, ProcessState } from '@/types'

type SortKey = 'pid' | 'name' | 'cpu_percent' | 'memory_bytes' | 'state' | 'user' | 'run_time'
type StateFilter = 'all' | ProcessState

const PAGE_SIZE = 14

const STATE_STYLE: Record<ProcessState, string> = {
  running: 'text-success',
  sleeping: 'text-fg-muted',
  idle: 'text-fg-subtle',
  zombie: 'text-danger',
  stopped: 'text-warning',
}

const STATE_FILTERS: { value: StateFilter; label: string }[] = [
  { value: 'all', label: 'All states' },
  { value: 'running', label: 'Running' },
  { value: 'sleeping', label: 'Sleeping' },
  { value: 'idle', label: 'Idle' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'zombie', label: 'Zombie' },
]

interface ProcessTableProps {
  processes: Process[]
  className?: string
}

/**
 * Process monitor.
 *
 * Rows render as plain elements — the previous per-row entrance animation
 * meant every keystroke in the filter box mounted a fresh set of animations.
 */
function ProcessTableComponent({ processes, className }: ProcessTableProps) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('cpu_percent')
  const [descending, setDescending] = useState(true)
  const [stateFilter, setStateFilter] = useState<StateFilter>('all')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return processes.filter((process) => {
      if (stateFilter !== 'all' && process.state !== stateFilter) return false
      if (!needle) return true
      return (
        process.name.toLowerCase().includes(needle) ||
        process.command.toLowerCase().includes(needle) ||
        process.user.toLowerCase().includes(needle) ||
        String(process.pid).includes(needle)
      )
    })
  }, [processes, query, stateFilter])

  const sorted = useMemo(() => {
    const direction = descending ? -1 : 1
    return [...filtered].sort((a, b) => {
      const left = a[sortKey]
      const right = b[sortKey]
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction
      return String(left).localeCompare(String(right)) * direction
    })
  }, [filtered, sortKey, descending])

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const rows = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setDescending((v) => !v)
      } else {
        setSortKey(key)
        setDescending(key === 'cpu_percent' || key === 'memory_bytes' || key === 'run_time')
      }
      setPage(0)
    },
    [sortKey],
  )

  const sortFor = (key: SortKey) => ({
    active: key === sortKey,
    descending,
    onSort: () => toggleSort(key),
  })

  return (
    <Card flush className={cn('overflow-hidden', className)}>
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <CardHeader title="Processes" description={`${filtered.length} of ${processes.length} shown`} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-44 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(0)
              }}
              placeholder="Filter by name, command, user or PID"
              aria-label="Filter processes"
              className="pl-8"
            />
          </div>
          <Dropdown<StateFilter>
            className="w-32"
            value={stateFilter}
            onChange={(value) => {
              setStateFilter(value)
              setPage(0)
            }}
            items={STATE_FILTERS}
          />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="px-4 pb-4">
          <EmptyState
            icon={<Search className="size-4" />}
            title="No matching processes"
            description="Adjust the search term or state filter to widen the result set."
          />
        </div>
      ) : (
        <>
          <TableScroll className="max-h-[34rem]">
            <Table minWidth="46rem">
              <TableHead sticky>
                <Th className="w-16" sort={sortFor('pid')}>
                  PID
                </Th>
                <Th sort={sortFor('name')}>Process</Th>
                <Th className="w-20" numeric sort={sortFor('cpu_percent')}>
                  CPU
                </Th>
                <Th className="w-24" numeric sort={sortFor('memory_bytes')}>
                  Memory
                </Th>
                <Th className="w-24" sort={sortFor('state')}>
                  Status
                </Th>
                <Th className="w-28" sort={sortFor('user')}>
                  User
                </Th>
                <Th className="w-24" numeric sort={sortFor('run_time')}>
                  Uptime
                </Th>
              </TableHead>
              <TableBody>
                {rows.map((process) => (
                  <Tr key={`${process.pid}-${process.name}`}>
                    <Td muted className="font-mono">
                      {process.pid}
                    </Td>
                    <Td className="max-w-0">
                      <p className="truncate font-medium">{process.name}</p>
                      <p className="truncate text-micro text-fg-subtle">{process.command}</p>
                    </Td>
                    <Td numeric>{process.cpu_percent.toFixed(1)}%</Td>
                    <Td numeric muted>
                      {formatBytes(process.memory_bytes)}
                    </Td>
                    <Td>
                      <span className={cn('text-micro', STATE_STYLE[process.state])}>{process.state}</span>
                    </Td>
                    <Td muted className="truncate">
                      {process.user}
                    </Td>
                    <Td numeric muted>
                      {formatDuration(process.run_time)}
                    </Td>
                  </Tr>
                ))}
              </TableBody>
            </Table>
          </TableScroll>

          <div className="flex items-center justify-between gap-3 border-t border-line bg-inset px-4 py-2">
            <p className="text-micro text-fg-subtle tnum">
              {safePage * PAGE_SIZE + 1}–{Math.min(sorted.length, (safePage + 1) * PAGE_SIZE)} of {sorted.length}
            </p>
            <div className="flex items-center gap-1">
              <IconButton
                label="Previous page"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="size-7"
              >
                <ChevronLeft className="size-3.5" />
              </IconButton>
              <span className="px-1 text-micro text-fg-subtle tnum">
                {safePage + 1} / {pageCount}
              </span>
              <IconButton
                label="Next page"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
                className="size-7"
              >
                <ChevronRight className="size-3.5" />
              </IconButton>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

export const ProcessTable = memo(ProcessTableComponent)
