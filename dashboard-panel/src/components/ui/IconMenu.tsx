import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface IconMenuItem {
  id: string
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
}

interface IconMenuProps {
  trigger: ReactNode
  items: IconMenuItem[]
  label: string
  className?: string
}

/** Compact icon-triggered action menu (the "…" overflow control). */
export function IconMenu({ trigger, items, label, className }: IconMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
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
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-8 items-center justify-center rounded-md border border-line bg-surface text-fg-muted transition-colors duration-150 hover:border-line-strong hover:bg-surface-hover hover:text-fg"
      >
        {trigger}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.12, ease: [0.2, 0, 0.13, 1] }}
            className="absolute right-0 z-60 mt-1 w-48 rounded-md border border-line bg-elevated p-1 shadow-popover"
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onSelect()
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-meta transition-colors duration-100',
                  item.danger
                    ? 'text-danger hover:bg-danger-soft'
                    : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
