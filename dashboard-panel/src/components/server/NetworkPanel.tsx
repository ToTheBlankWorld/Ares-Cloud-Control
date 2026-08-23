import { memo } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Table, TableBody, TableHead, TableScroll, Td, Th, Tr } from '@/components/ui/Table'
import { formatBitrate, formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { NetworkMetrics } from '@/types'

interface NetworkPanelProps {
  network: NetworkMetrics
  className?: string
}

/**
 * Interfaces as a table rather than a stack of sub-cards: this is columnar
 * data and reads far faster when the columns actually line up.
 */
function NetworkPanelComponent({ network, className }: NetworkPanelProps) {
  return (
    <Card flush className={cn('overflow-hidden', className)}>
      <div className="px-4 py-3">
        <CardHeader title="Network" description={`${network.interfaces.length} interfaces`} />
      </div>

      {network.interfaces.length === 0 ? (
        <p className="px-4 py-8 text-center text-meta text-fg-muted">No interfaces reported.</p>
      ) : (
        <TableScroll>
          <Table minWidth="40rem">
            <TableHead>
              <Th>Interface</Th>
              <Th>Address</Th>
              <Th numeric>TX</Th>
              <Th numeric>RX</Th>
              <Th numeric>Total sent</Th>
              <Th numeric>Total received</Th>
            </TableHead>
            <TableBody>
              {network.interfaces.map((iface) => (
                <Tr key={iface.name}>
                  <Td>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn('size-1.5 shrink-0 rounded-full', iface.is_up ? 'bg-success' : 'bg-fg-subtle')}
                        aria-label={iface.is_up ? 'Up' : 'Down'}
                      />
                      <span className="font-mono">{iface.name}</span>
                      {iface.is_loopback && <span className="text-micro text-fg-subtle">loopback</span>}
                    </span>
                  </Td>
                  <Td muted className="font-mono text-micro">
                    {iface.ipv4_addresses[0] ?? iface.ipv6_addresses[0] ?? '—'}
                  </Td>
                  <Td numeric>
                    <span className="inline-flex items-center gap-1 text-fg-muted">
                      <ArrowUp className="size-3 shrink-0" />
                      {formatBitrate(iface.transmitted_bytes_per_sec)}
                    </span>
                  </Td>
                  <Td numeric>
                    <span className="inline-flex items-center gap-1 text-fg-muted">
                      <ArrowDown className="size-3 shrink-0" />
                      {formatBitrate(iface.received_bytes_per_sec)}
                    </span>
                  </Td>
                  <Td numeric muted>
                    {formatBytes(iface.transmitted_bytes)}
                  </Td>
                  <Td numeric muted>
                    {formatBytes(iface.received_bytes)}
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </TableScroll>
      )}
    </Card>
  )
}

export const NetworkPanel = memo(NetworkPanelComponent)
