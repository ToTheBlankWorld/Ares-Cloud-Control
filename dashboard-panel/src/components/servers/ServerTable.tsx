import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatusText } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Table, TableBody, TableHead, TableScroll, Td, Th, Tr } from '@/components/ui/Table'
import { formatBitrate, formatBytes, formatRelativeTime, formatUptime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Server } from '@/types'

export type ServerSortKey = 'name' | 'status' | 'cpu' | 'memory' | 'disk' | 'uptime'

interface ServerTableProps {
  servers: Server[]
  sortKey: ServerSortKey
  descending: boolean
  onSort: (key: ServerSortKey) => void
  className?: string
}

/** Usage cell: number first, bar second. The bar is a hint, not the reading. */
function UsageCell({ percent, caption }: { percent: number; caption: string }) {
  return (
    <div className="min-w-20">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-meta text-fg tnum">{percent.toFixed(1)}%</span>
        <span className="text-micro text-fg-subtle tnum">{caption}</span>
      </div>
      <Progress value={percent} className="mt-1" height={2} />
    </div>
  )
}

/**
 * Fleet table. Every column the operator needs to triage a machine without
 * opening it: identity, state, capacity, throughput and last contact.
 */
function ServerTableComponent({ servers, sortKey, descending, onSort, className }: ServerTableProps) {
  const sortFor = (key: ServerSortKey) => ({
    active: key === sortKey,
    descending,
    onSort: () => onSort(key),
  })

  return (
    <Card flush className={cn('overflow-hidden', className)}>
      <TableScroll>
        <Table minWidth="66rem">
          <TableHead>
            <Th sort={sortFor('name')}>Host</Th>
            <Th className="w-28" sort={sortFor('status')}>
              Status
            </Th>
            <Th className="w-40">OS</Th>
            <Th className="w-36" sort={sortFor('cpu')}>
              CPU
            </Th>
            <Th className="w-36" sort={sortFor('memory')}>
              Memory
            </Th>
            <Th className="w-36" sort={sortFor('disk')}>
              Disk
            </Th>
            <Th className="w-28" numeric>
              Network
            </Th>
            <Th className="w-28" sort={sortFor('uptime')}>
              Uptime
            </Th>
            <Th className="w-28">Heartbeat</Th>
            <Th className="w-10" aria-label="Open" />
          </TableHead>
          <TableBody>
            {servers.map((server) => (
              <Tr key={server.id}>
                <Td>
                  <Link to={`/servers/${server.id}`} className="block">
                    <span className="block truncate font-medium text-fg">{server.name}</span>
                    <span className="mt-0.5 block truncate font-mono text-micro text-fg-subtle">
                      {server.hostname}
                    </span>
                  </Link>
                </Td>
                <Td>
                  <StatusText status={server.status} />
                </Td>
                <Td muted className="truncate">
                  {server.os}
                </Td>
                <Td>
                  <UsageCell percent={server.cpu.usagePercent} caption={`${server.cpu.cores}c`} />
                </Td>
                <Td>
                  <UsageCell
                    percent={server.memory.usagePercent}
                    caption={formatBytes(server.memory.totalBytes)}
                  />
                </Td>
                <Td>
                  <UsageCell percent={server.disk.usagePercent} caption={formatBytes(server.disk.totalBytes)} />
                </Td>
                <Td numeric muted>
                  <span className="block">↑ {formatBitrate(server.network.txBytesPerSec)}</span>
                  <span className="block text-micro">↓ {formatBitrate(server.network.rxBytesPerSec)}</span>
                </Td>
                <Td muted className="tnum">
                  {server.status === 'offline' ? '—' : formatUptime(server.uptimeSeconds)}
                </Td>
                <Td muted className="tnum">
                  {server.status === 'offline'
                    ? 'lost'
                    : formatRelativeTime(new Date(Date.now() - 2000).toISOString())}
                </Td>
                <Td className="text-right">
                  <Link
                    to={`/servers/${server.id}`}
                    aria-label={`Open ${server.name}`}
                    className="inline-flex rounded-sm p-1 text-fg-subtle transition-colors duration-150 hover:text-fg"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </Td>
              </Tr>
            ))}
          </TableBody>
        </Table>
      </TableScroll>
    </Card>
  )
}

export const ServerTable = memo(ServerTableComponent)
