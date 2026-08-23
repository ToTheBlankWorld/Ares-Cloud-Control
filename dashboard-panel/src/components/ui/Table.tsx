import type { ReactNode, ThHTMLAttributes } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Dense table primitives.
 *
 * One definition of row height, hairline colour, header treatment and hover
 * state, shared by the fleet list, filesystem table and process monitor — they
 * previously each carried their own copy of the same twenty classes.
 */

export function TableScroll({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('w-full overflow-x-auto thin-scrollbar', className)}>{children}</div>
}

export function Table({ children, className, minWidth }: { children: ReactNode; className?: string; minWidth?: string }) {
  return (
    <table
      className={cn('w-full border-collapse text-left', className)}
      style={minWidth ? { minWidth } : undefined}
    >
      {children}
    </table>
  )
}

/** Sticky header: stays put while a long process list scrolls under it. */
export function TableHead({ children, sticky = false }: { children: ReactNode; sticky?: boolean }) {
  return (
    <thead className={cn(sticky && 'sticky top-0 z-10')}>
      <tr className="border-b border-line bg-inset">{children}</tr>
    </thead>
  )
}

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Omit for a spacer column (e.g. a trailing chevron). */
  children?: ReactNode
  numeric?: boolean
  /** Present the header as a sort control. */
  sort?: { active: boolean; descending: boolean; onSort: () => void }
}

export function Th({ children, numeric = false, sort, className, ...props }: ThProps) {
  const content = sort ? (
    <button
      type="button"
      onClick={sort.onSort}
      className={cn(
        'inline-flex items-center gap-1 transition-colors duration-150',
        numeric && 'flex-row-reverse',
        sort.active ? 'text-fg' : 'hover:text-fg-muted',
      )}
    >
      {children}
      {sort.active &&
        (sort.descending ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
    </button>
  ) : (
    children
  )

  return (
    <th
      scope="col"
      aria-sort={sort ? (sort.active ? (sort.descending ? 'descending' : 'ascending') : 'none') : undefined}
      className={cn('label px-3 py-2 font-medium uppercase whitespace-nowrap', numeric && 'text-right', className)}
      {...props}
    >
      {content}
    </th>
  )
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line-subtle">{children}</tbody>
}

export function Tr({
  children,
  className,
  interactive = true,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <tr className={cn(interactive && 'transition-colors duration-100 hover:bg-surface-hover', className)}>
      {children}
    </tr>
  )
}

export function Td({
  children,
  className,
  numeric = false,
  muted = false,
}: {
  children: ReactNode
  className?: string
  numeric?: boolean
  muted?: boolean
}) {
  return (
    <td
      className={cn(
        'px-3 py-2 text-meta',
        numeric && 'text-right tnum',
        muted ? 'text-fg-muted' : 'text-fg',
        className,
      )}
    >
      {children}
    </td>
  )
}
