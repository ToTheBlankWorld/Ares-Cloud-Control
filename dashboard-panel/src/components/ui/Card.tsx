import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a hover surface change. Only for panels that navigate somewhere. */
  interactive?: boolean
  /** Removes internal padding so the panel can host a table edge-to-edge. */
  flush?: boolean
}

/**
 * The instrument panel. One hairline border, a flat surface, a restrained
 * radius and no shadow to speak of. Every data surface in the product is one
 * of these — the differentiation comes from the content, not the container.
 */
export function Card({ className, interactive = false, flush = false, children, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'relative rounded-lg border border-line bg-surface shadow-panel',
        !flush && 'p-4',
        interactive && 'transition-colors duration-150 hover:border-line-strong hover:bg-surface-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

/**
 * Panel heading. Deliberately has no icon slot: an icon per panel was pure
 * decoration and made every panel read the same.
 */
export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="truncate text-heading font-semibold text-fg">{title}</h3>
        {description && <p className="mt-0.5 truncate text-meta text-fg-subtle">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  )
}

/** Small label above a value or a dense group. */
export function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('label uppercase', className)}>{children}</div>
}

/** Horizontal rule matching the panel hairline. */
export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-line', className)} role="presentation" />
}
