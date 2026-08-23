import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DropdownItem<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  description?: string
}

interface DropdownProps<T extends string> {
  items: DropdownItem<T>[]
  value: T
  onChange: (value: T) => void
  label?: string
  className?: string
  align?: 'left' | 'right'
  size?: 'sm' | 'md'
}

/** Popover transition: opacity plus 2px, 120ms. Enough to read as a menu. */
const POPOVER_MOTION = {
  initial: { opacity: 0, y: -2 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -2 },
  transition: { duration: 0.12, ease: [0.2, 0, 0.13, 1] as const },
}

export function Dropdown<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
  align = 'left',
  size = 'md',
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = items.find((item) => item.value === value)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex w-full items-center justify-between gap-2 rounded-md border border-line bg-surface px-2.5',
          'text-meta text-fg transition-colors duration-150 hover:border-line-strong hover:bg-surface-hover',
          size === 'sm' ? 'h-7' : 'h-8',
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selected?.icon}
          <span className="truncate">{selected?.label ?? label ?? 'Select'}</span>
        </span>
        <ChevronDown
          className={cn('size-3.5 shrink-0 text-fg-subtle transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            {...POPOVER_MOTION}
            className={cn(
              'absolute z-50 mt-1 max-h-72 w-max min-w-full overflow-auto rounded-md border border-line bg-elevated p-1 shadow-popover thin-scrollbar',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {items.map((item) => {
              const active = item.value === value
              return (
                <li key={item.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(item.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-meta transition-colors duration-100',
                      active ? 'text-fg' : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
                    )}
                  >
                    {item.icon}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.label}</span>
                      {item.description && (
                        <span className="block truncate text-micro text-fg-subtle">{item.description}</span>
                      )}
                    </span>
                    {active && <Check className="size-3.5 shrink-0 text-accent" />}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
