import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, LogOut, Settings, ShieldCheck } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

interface ProfileChipProps {
  collapsed?: boolean
  className?: string
  align?: 'up' | 'down'
}

const OPERATOR = { name: 'N. Aree', role: 'Root operator', initials: 'NA' }

const MENU_LINK =
  'flex items-center gap-2 rounded-sm px-2 py-1.5 text-meta text-fg-muted transition-colors duration-100 hover:bg-surface-hover hover:text-fg'

export function ProfileChip({ collapsed = false, className, align = 'up' }: ProfileChipProps) {
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

  const avatar = (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-surface-active text-micro font-medium text-fg-muted">
      {OPERATOR.initials}
    </span>
  )

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 transition-colors duration-150 hover:bg-surface-hover',
          collapsed && 'justify-center px-0',
        )}
      >
        {collapsed ? (
          <Tooltip content={`${OPERATOR.name} · ${OPERATOR.role}`} side="right">
            {avatar}
          </Tooltip>
        ) : (
          avatar
        )}
        {!collapsed && (
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-meta font-medium text-fg">{OPERATOR.name}</span>
            <span className="block truncate text-micro text-fg-subtle">{OPERATOR.role}</span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: align === 'up' ? 2 : -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: align === 'up' ? 2 : -2 }}
            transition={{ duration: 0.12, ease: [0.2, 0, 0.13, 1] }}
            className={cn(
              'absolute right-0 left-0 z-60 min-w-48 rounded-md border border-line bg-elevated p-1 shadow-popover',
              align === 'up' ? 'bottom-full mb-1' : 'top-full mt-1',
            )}
          >
            <div className="border-b border-line px-2 py-1.5">
              <p className="truncate text-meta font-medium text-fg">{OPERATOR.name}</p>
              <p className="truncate text-micro text-fg-subtle">ares-control-plane</p>
            </div>
            <div className="pt-1">
              <Link to="/settings" onClick={() => setOpen(false)} className={MENU_LINK}>
                <Settings className="size-3.5 text-fg-subtle" />
                Settings
              </Link>
              <Link to="/settings?section=security" onClick={() => setOpen(false)} className={MENU_LINK}>
                <ShieldCheck className="size-3.5 text-fg-subtle" />
                Security
              </Link>
              <a
                href="https://github.com/ToTheBlankWorld/Ares-Cloud-Control"
                target="_blank"
                rel="noreferrer noopener"
                className={MENU_LINK}
              >
                <BookOpen className="size-3.5 text-fg-subtle" />
                Documentation
              </a>
            </div>
            <div className="mt-1 border-t border-line pt-1">
              <Link to="/" onClick={() => setOpen(false)} className={MENU_LINK}>
                <LogOut className="size-3.5 text-fg-subtle" />
                Exit control center
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
