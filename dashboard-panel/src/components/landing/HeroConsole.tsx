import { useMemo } from 'react'
import { Sparkline } from '@/components/dashboard/Sparkline'
import { buildSeries, mockServers } from '@/data/mockData'
import { formatBytes, formatUptime } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Hero visual: a scaled-down rendering of the actual console.
 *
 * This replaces the orbiting node-graph animation that used to sit here. A
 * network diagram with travelling pulses says "concept"; showing the real
 * product surface says "this exists and here is what it looks like" — which is
 * what an engineer evaluating a monitoring tool actually wants to see.
 */
export function HeroConsole({ className }: { className?: string }) {
  const servers = mockServers
  const series = useMemo(() => buildSeries(servers[0].id, '1h'), [servers])
  const spark = useMemo(() => series.map((p) => p.cpu), [series])
  const memSpark = useMemo(() => series.map((p) => p.memory), [series])

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-line bg-surface shadow-[0_24px_60px_-24px_rgb(0_0_0/0.6)]',
        className,
      )}
      aria-hidden
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-line bg-inset px-3 py-2">
        <div className="flex gap-1.5">
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="size-2 rounded-full bg-line-strong" />
        </div>
        <span className="ml-2 text-micro text-fg-subtle">ares · overview</span>
        <span className="ml-auto flex items-center gap-1.5 text-micro text-fg-subtle">
          <span className="size-1.5 rounded-full bg-success" />2 online
        </span>
      </div>

      <div className="flex">
        {/* Navigation rail */}
        <div className="hidden w-32 shrink-0 border-r border-line py-2.5 sm:block">
          {['Overview', 'Servers', 'Monitoring', 'Processes', 'Alerts'].map((item, index) => (
            <div
              key={item}
              className={cn(
                'relative mx-1.5 flex h-6 items-center rounded-sm px-2 text-micro',
                index === 0 ? 'bg-surface-active text-fg' : 'text-fg-subtle',
              )}
            >
              {index === 0 && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent" />}
              {item}
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* KPI strip */}
          <div className="grid grid-cols-3 divide-x divide-line-subtle border-b border-line-subtle">
            {[
              { label: 'CPU', value: '11.24', unit: '%' },
              { label: 'Memory', value: '15.8', unit: '%' },
              { label: 'Load', value: '1.82', unit: '' },
            ].map((stat) => (
              <div key={stat.label} className="px-3 py-2.5">
                <p className="label uppercase">{stat.label}</p>
                <p className="mt-1 text-heading font-semibold text-fg tnum">
                  {stat.value}
                  <span className="ml-0.5 text-micro text-fg-subtle">{stat.unit}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="border-b border-line-subtle px-3 py-3">
            <div className="flex items-baseline justify-between">
              <p className="label uppercase">CPU utilisation</p>
              <p className="text-micro text-fg-subtle">1h</p>
            </div>
            <Sparkline data={spark} height={58} />
          </div>

          {/* Fleet rows */}
          <div className="divide-y divide-line-subtle">
            {servers.slice(0, 3).map((server) => (
              <div key={server.id} className="flex items-center gap-3 px-3 py-2">
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    server.status === 'online' ? 'bg-success' : 'bg-danger',
                  )}
                />
                <span className="w-24 shrink-0 truncate text-micro text-fg">{server.name}</span>
                <span className="hidden w-24 shrink-0 truncate text-micro text-fg-subtle md:block">
                  {formatBytes(server.memory.totalBytes)}
                </span>
                <span className="hidden min-w-0 flex-1 md:block">
                  <Sparkline
                    data={server.status === 'offline' ? memSpark.map(() => 0) : server.sparkline}
                    height={14}
                    filled={false}
                    color={server.status === 'offline' ? 'var(--color-line-strong)' : 'var(--color-accent)'}
                  />
                </span>
                <span className="ml-auto shrink-0 text-micro text-fg-subtle tnum">
                  {server.status === 'offline' ? 'down' : formatUptime(server.uptimeSeconds)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
