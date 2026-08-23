import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SettingsTab<T extends string> {
  value: T
  label: string
  icon: LucideIcon
}

interface SettingsSidebarProps<T extends string> {
  tabs: SettingsTab<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/**
 * Settings navigation. Same active treatment as the main sidebar so the two
 * read as one navigation system rather than two different components.
 */
export function SettingsSidebar<T extends string>({ tabs, value, onChange, className }: SettingsSidebarProps<T>) {
  return (
    <nav
      aria-label="Settings sections"
      className={cn('flex gap-1 overflow-x-auto no-scrollbar lg:flex-col lg:overflow-visible', className)}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'relative flex h-8 shrink-0 items-center gap-2.5 rounded-sm px-2 text-meta transition-colors duration-150 lg:w-full',
              active
                ? 'bg-surface-active font-medium text-fg'
                : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
            )}
          >
            {active && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent" aria-hidden />}
            <Icon className={cn('size-4 shrink-0', active ? 'text-fg' : 'text-fg-subtle')} strokeWidth={1.75} />
            <span className="truncate">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
