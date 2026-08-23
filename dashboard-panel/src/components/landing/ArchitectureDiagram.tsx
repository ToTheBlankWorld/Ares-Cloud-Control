import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

const STAGES = [
  {
    step: '01',
    title: 'ARES agent',
    subtitle: 'Rust · systemd',
    detail: 'Collects CPU, memory, disk, network, GPU, thermals and processes once per second.',
  },
  {
    step: '02',
    title: 'Secure tunnel',
    subtitle: 'Cloudflare',
    detail: 'The agent binds to localhost and is published through an authenticated TLS tunnel.',
  },
  {
    step: '03',
    title: 'Control console',
    subtitle: 'React · Vite',
    detail: 'Renders the snapshot into charts, panels and alerts with no server of its own.',
  },
]

const ENDPOINTS = [
  'GET /api/health',
  'GET /api/system',
  'GET /api/cpu',
  'GET /api/memory',
  'GET /api/disk',
  'GET /api/network',
  'GET /api/gpu',
  'GET /api/processes',
  'GET /api/metrics',
  'WS  /ws',
]

export function ArchitectureDiagram({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STAGES.map((stage) => (
          <Card key={stage.step} className="h-full">
            <div className="flex items-baseline gap-2.5">
              <span className="text-micro text-fg-subtle tnum">{stage.step}</span>
              <div className="min-w-0">
                <p className="truncate text-heading font-semibold text-fg">{stage.title}</p>
                <p className="truncate text-micro text-fg-subtle">{stage.subtitle}</p>
              </div>
            </div>
            <p className="mt-3 text-meta leading-relaxed text-fg-muted">{stage.detail}</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="label uppercase">Agent endpoints</p>
        <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {ENDPOINTS.map((endpoint) => (
            <span key={endpoint} className="font-mono text-micro text-fg-muted">
              {endpoint}
            </span>
          ))}
        </div>
      </Card>
    </div>
  )
}
