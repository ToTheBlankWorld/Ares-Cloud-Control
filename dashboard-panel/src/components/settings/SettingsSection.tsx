import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
}

/**
 * Administration section.
 *
 * A heading with a hairline under it rather than a card — stacking six bordered
 * cards down a settings page made every group look like a separate product.
 */
export function SettingsSection({ title, description, children, actions, className }: SettingsSectionProps) {
  return (
    <section className={cn('border-b border-line pb-6 last:border-0 last:pb-0', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-heading font-semibold text-fg">{title}</h2>
          {description && <p className="mt-1 max-w-xl text-meta leading-relaxed text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

interface SettingsRowProps {
  label: string
  description?: string
  children: ReactNode
  className?: string
}

export function SettingsRow({ label, description, children, className }: SettingsRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 border-b border-line-subtle py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-meta font-medium text-fg">{label}</p>
        {description && <p className="mt-0.5 text-micro leading-relaxed text-fg-muted">{description}</p>}
      </div>
      <div className="shrink-0 sm:w-56">{children}</div>
    </div>
  )
}
