import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  count?: number
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  /** `underline` for page-level navigation, `segmented` for compact controls. */
  variant?: 'underline' | 'segmented'
}

/**
 * Both variants are pure CSS. The previous shared-layout indicator measured
 * every tab on each change; a static border does the same job for free.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  variant = 'underline',
}: TabsProps<T>) {
  if (variant === 'segmented') {
    return (
      <div
        role="tablist"
        className={cn(
          'inline-flex shrink-0 items-center gap-0.5 rounded-md border border-line bg-inset p-0.5',
          className,
        )}
      >
        {items.map((item) => {
          const active = item.value === value
          return (
            <button
              key={item.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onChange(item.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-sm px-2 py-1 text-micro font-medium transition-colors duration-150',
                active
                  ? 'bg-surface-active text-fg'
                  : 'text-fg-subtle hover:text-fg-muted',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div role="tablist" className={cn('flex items-center gap-4 border-b border-line', className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative flex items-center gap-2 py-2.5 text-meta font-medium transition-colors duration-150',
              'after:absolute after:inset-x-0 after:-bottom-px after:h-px after:transition-colors after:duration-150',
              active
                ? 'text-fg after:bg-accent'
                : 'text-fg-subtle after:bg-transparent hover:text-fg-muted',
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === 'number' && item.count > 0 && (
              <span
                className={cn(
                  'rounded-sm px-1 py-px text-micro tnum',
                  active ? 'bg-accent-soft text-accent' : 'bg-surface-active text-fg-subtle',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
