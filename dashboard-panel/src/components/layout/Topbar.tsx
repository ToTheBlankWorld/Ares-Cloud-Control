import { memo, useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ChevronRight, Menu, Search } from 'lucide-react'
import { BREADCRUMB_LABELS } from '@/components/layout/navigation'
import { NotificationsMenu } from '@/components/layout/NotificationsMenu'
import { ProfileChip } from '@/components/layout/ProfileChip'
import { StatusDot } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Server } from '@/types'

interface TopbarProps {
  servers: Server[]
  onOpenDrawer: () => void
  onOpenSearch: () => void
}

/**
 * Application bar: where you are, what the fleet is doing, and the three
 * global controls. Solid surface, no backdrop blur — blurring a sticky bar
 * repaints the region behind it on every scroll frame.
 */
function TopbarComponent({ servers, onOpenDrawer, onOpenSearch }: TopbarProps) {
  const location = useLocation()
  const params = useParams<{ id?: string }>()

  const crumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    return segments.map((segment, index) => {
      const to = `/${segments.slice(0, index + 1).join('/')}`
      const server = params.id === segment ? servers.find((s) => s.id === segment) : undefined
      return { to, label: server?.name ?? BREADCRUMB_LABELS[segment] ?? segment }
    })
  }, [location.pathname, params.id, servers])

  const online = servers.filter((s) => s.status === 'online').length
  const degraded = servers.length - online

  return (
    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-3 border-b border-line bg-canvas px-3 md:px-4">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open navigation"
        className="-ml-1 rounded-sm p-1.5 text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg lg:hidden"
      >
        <Menu className="size-4" />
      </button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5">
        {crumbs.map((crumb, index) => (
          <span key={crumb.to} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && <ChevronRight className="size-3 shrink-0 text-fg-subtle" aria-hidden />}
            {index === crumbs.length - 1 ? (
              <span className="truncate text-meta font-medium text-fg">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.to}
                className="truncate text-meta text-fg-muted transition-colors duration-150 hover:text-fg"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-1.5">
        <span className="hidden items-center gap-1.5 text-micro text-fg-muted md:inline-flex">
          <StatusDot status={online > 0 ? 'online' : 'offline'} />
          <span className="tnum">{online}</span> online
          {degraded > 0 && (
            <>
              <span className="text-fg-subtle">/</span>
              <span className="tnum text-fg-subtle">{degraded} down</span>
            </>
          )}
        </span>

        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-7 items-center gap-2 rounded-md border border-line bg-surface pr-1 pl-2 text-fg-subtle transition-colors duration-150 hover:border-line-strong hover:text-fg-muted"
          aria-label="Search (Ctrl+K)"
        >
          <Search className="size-3.5" />
          <span className="hidden text-micro sm:inline">Search</span>
          <kbd className="hidden rounded-xs bg-surface-active px-1 py-0.5 font-sans text-micro text-fg-subtle sm:inline">
            ⌘K
          </kbd>
        </button>

        <NotificationsMenu />

        <div className={cn('hidden w-36 lg:block')}>
          <ProfileChip align="down" />
        </div>
      </div>
    </header>
  )
}

export const Topbar = memo(TopbarComponent)
