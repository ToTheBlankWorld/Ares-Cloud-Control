import { memo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { AresLogo } from '@/components/brand/AresLogo'
import { NAV_GROUPS } from '@/components/layout/navigation'
import { ConnectionPill } from '@/components/layout/ConnectionPill'
import { ProfileChip } from '@/components/layout/ProfileChip'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  /** Rendered inside the mobile drawer — hides the collapse affordance. */
  variant?: 'fixed' | 'drawer'
  onNavigate?: () => void
}

/**
 * Primary navigation.
 *
 * The active item is a 2px accent rule plus a slightly lighter surface — quiet
 * enough to scan past, unambiguous when you look for it. No pill, no glow, no
 * shared-layout animation.
 */
function SidebarComponent({ collapsed, onToggleCollapse, variant = 'fixed', onNavigate }: SidebarProps) {
  const location = useLocation()
  const isDrawer = variant === 'drawer'
  const isCollapsed = collapsed && !isDrawer

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'flex h-full flex-col border-r border-line bg-surface',
        isDrawer ? 'w-64' : 'w-full',
      )}
    >
      <div
        className={cn(
          'flex h-12 shrink-0 items-center border-b border-line',
          isCollapsed ? 'justify-center px-2' : 'justify-between pr-2 pl-3',
        )}
      >
        <NavLink to="/" aria-label="ARES Cloud Control home" onClick={onNavigate} className="min-w-0">
          <AresLogo markOnly={isCollapsed} size={isCollapsed ? 22 : 22} />
        </NavLink>
        {!isDrawer && !isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="rounded-sm p-1.5 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      {!isDrawer && isCollapsed && (
        <div className="flex justify-center border-b border-line py-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="rounded-sm p-1.5 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-3 thin-scrollbar">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label} className={cn('px-2', groupIndex > 0 && 'mt-5')}>
            {!isCollapsed && <p className="label mb-1 px-2 uppercase">{group.label}</p>}
            {isCollapsed && groupIndex > 0 && <div className="mx-2 mb-2 h-px bg-line" role="presentation" />}

            <ul className="space-y-px">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = item.matchPrefix
                  ? location.pathname.startsWith(item.matchPrefix)
                  : location.pathname === item.to

                const link = (
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex h-7.5 items-center gap-2.5 rounded-sm text-meta transition-colors duration-150',
                      isCollapsed ? 'w-full justify-center px-0' : 'px-2',
                      active
                        ? 'bg-surface-active font-medium text-fg'
                        : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
                    )}
                  >
                    {active && (
                      <span
                        className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent"
                        aria-hidden
                      />
                    )}
                    <Icon
                      className={cn('size-4 shrink-0', active ? 'text-fg' : 'text-fg-subtle')}
                      strokeWidth={1.75}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                )

                return (
                  <li key={item.to}>
                    {isCollapsed ? (
                      <Tooltip content={item.label} side="right" triggerClassName="w-full">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className={cn('shrink-0 border-t border-line', isCollapsed ? 'p-2' : 'p-2')}>
        <ConnectionPill collapsed={isCollapsed} />
        <ProfileChip collapsed={isCollapsed} className="mt-1" />
      </div>
    </nav>
  )
}

export const Sidebar = memo(SidebarComponent)
