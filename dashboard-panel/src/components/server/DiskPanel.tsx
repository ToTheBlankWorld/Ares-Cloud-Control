import { memo } from 'react'
import { Card, CardHeader, FieldLabel } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Table, TableBody, TableHead, TableScroll, Td, Th, Tr } from '@/components/ui/Table'
import { formatBitrate, formatBytes, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DiskMetrics } from '@/types'

interface DiskPanelProps {
  disk: DiskMetrics
  className?: string
}

function DiskPanelComponent({ disk, className }: DiskPanelProps) {
  const io = disk.io

  return (
    <Card flush className={cn('overflow-hidden', className)}>
      <div className="px-4 py-3">
        <CardHeader title="Storage" description={`${disk.filesystems.length} mounted filesystems`} />
      </div>

      <TableScroll>
        <Table minWidth="34rem">
          <TableHead>
            <Th>Mount</Th>
            <Th>Filesystem</Th>
            <Th numeric>Used</Th>
            <Th numeric>Available</Th>
            <Th className="w-48">Usage</Th>
          </TableHead>
          <TableBody>
            {disk.filesystems.map((fs) => (
              <Tr key={fs.mount_point}>
                <Td className="font-mono">{fs.mount_point}</Td>
                <Td muted>{fs.filesystem}</Td>
                <Td numeric muted>
                  {formatBytes(fs.used_bytes)}
                </Td>
                <Td numeric muted>
                  {formatBytes(fs.available_bytes)}
                </Td>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Progress value={fs.usage_percent} className="min-w-16 flex-1" />
                    <span className="w-10 shrink-0 text-right text-micro text-fg-muted tnum">
                      {fs.usage_percent.toFixed(0)}%
                    </span>
                  </div>
                </Td>
              </Tr>
            ))}
          </TableBody>
        </Table>
      </TableScroll>

      <dl className="grid grid-cols-2 gap-4 border-t border-line bg-inset px-4 py-3 sm:grid-cols-4">
        {[
          { label: 'Read', value: formatBitrate(io.read_bytes_per_sec) },
          { label: 'Write', value: formatBitrate(io.write_bytes_per_sec) },
          { label: 'Read IOPS', value: formatNumber(io.read_ops_per_sec) },
          { label: 'Write IOPS', value: formatNumber(io.write_ops_per_sec) },
        ].map((item) => (
          <div key={item.label}>
            <FieldLabel>{item.label}</FieldLabel>
            <dd className="mt-1 text-meta text-fg tnum">{item.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

export const DiskPanel = memo(DiskPanelComponent)
