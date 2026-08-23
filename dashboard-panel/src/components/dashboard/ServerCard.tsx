import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { StatusDot } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Sparkline } from '@/components/dashboard/Sparkline'
import { formatBitrate, formatBytes, formatUptime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Server } from '@/types'

interface ServerCardProps {
  server: Server
}

function Meter({ label, percent, caption }: { label: string; percent: number; caption: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label uppercase">{label}</span>
        <span className="text-micro text-fg-muted tnum">{percent.toFixed(0)}%</span>
      </div>
      <Progress value={percent} className="mt-1.5" height={3} />
      <p className="mt-1 truncate text-micro text-fg-subtle">{caption}</p>
    </div>
  )
}

/**
 * Machine summary card.
 *
 * Hover is a border and surface change only. The card previously lifted,
 * illuminated its top edge and animated its chart on hover, which is three
 * effects to communicate one thing: this is clickable.
 */
function ServerCardComponent({ server }: ServerCardProps) {
  const offline = server.status === 'offline'

  return (
    <Link
      to={`/servers/${server.id}`}
      className={cn(
        'group block rounded-lg border border-line bg-surface shadow-panel transition-colors duration-150',
        'hover:border-line-strong hover:bg-surface-hover',
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-line-subtle px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusDot status={server.status} />
            <h3 className="truncate text-heading font-semibold text-fg">{server.name}</h3>
          </div>
          <p className="mt-1 truncate text-micro text-fg-subtle">
            {server.hostname} · {server.os}
          </p>
        </div>
        <span className="shrink-0 text-micro text-fg-subtle tnum">
          {offline ? 'down' : formatUptime(server.uptimeSeconds)}
        </span>
      </div>

      <div className="flex items-end justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <span className="label uppercase">CPU</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-metric font-semibold text-fg tnum">
              {server.cpu.usagePercent.toFixed(1)}
            </span>
            <span className="text-meta text-fg-subtle">%</span>
          </div>
          <p className="mt-1 text-micro text-fg-subtle tnum">
            {server.cpu.cores} cores · load {server.cpu.loadOne.toFixed(2)}
          </p>
        </div>
        <div className="w-28 shrink-0 sm:w-32">
          <Sparkline
            data={server.sparkline}
            height={36}
            color={offline ? 'var(--color-line-strong)' : 'var(--color-accent)'}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-line-subtle px-4 py-3">
        <Meter
          label="Memory"
          percent={server.memory.usagePercent}
          caption={`${formatBytes(server.memory.usedBytes)} of ${formatBytes(server.memory.totalBytes)}`}
        />
        <Meter
          label="Disk"
          percent={server.disk.usagePercent}
          caption={`${formatBytes(server.disk.usedBytes)} of ${formatBytes(server.disk.totalBytes)}`}
        />
      </div>

      <div className="flex items-center gap-4 border-t border-line-subtle px-4 py-2 text-micro text-fg-subtle tnum">
        <span className="flex items-center gap-1">
          <ArrowUp className="size-3" />
          {formatBitrate(server.network.txBytesPerSec)}
        </span>
        <span className="flex items-center gap-1">
          <ArrowDown className="size-3" />
          {formatBitrate(server.network.rxBytesPerSec)}
        </span>
        <span className="ml-auto truncate">{server.region}</span>
      </div>
    </Link>
  )
}

export const ServerCard = memo(ServerCardComponent)
