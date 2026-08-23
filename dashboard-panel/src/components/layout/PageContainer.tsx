import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: ReactNode
  className?: string
  /** Widens the content column for dense, table-heavy pages. */
  wide?: boolean
}

export function PageContainer({ children, className, wide = false }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-5 md:px-6 md:py-6',
        wide ? 'max-w-[120rem]' : 'max-w-[88rem]',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Rendered under the description — status summaries, counts, filters. */
  meta?: ReactNode
  className?: string
}

/**
 * Page heading. One size, one weight, no eyebrow label — the breadcrumb in the
 * top bar already says where you are, so repeating it above the title was
 * duplicated chrome.
 */
export function PageHeader({ title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-display font-semibold text-fg">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-body text-fg-muted">{description}</p>}
        {meta && <div className="mt-3">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
