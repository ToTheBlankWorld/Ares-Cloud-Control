import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Bell } from 'lucide-react'
import { useAlerts } from '@/hooks/useAresData'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AlertSeverity } from '@/types'

const SEVERITY_DOT: Record<AlertSeverity, string> = {
  critical: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-accent',
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { data } = useAlerts()

  const active = (data ?? []).filter((alert) => alert.status !== 'resolved')
  const hasCritical = active.some((alert) => alert.severity === 'critical')

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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications (${active.length} active)`}
        aria-expanded={open}
        className="relative flex size-7 items-center justify-center rounded-md text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
      >
        <Bell className="size-4" strokeWidth={1.75} />
        {active.length > 0 && (
          <span
            className={cn(
              'absolute top-1 right-1 size-1.5 rounded-full ring-2 ring-canvas',
              hasCritical ? 'bg-danger' : 'bg-warning',
            )}
            aria-hidden
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.12, ease: [0.2, 0, 0.13, 1] }}
            className="absolute right-0 z-60 mt-1.5 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-line bg-elevated shadow-popover"
          >
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <p className="text-meta font-medium text-fg">Notifications</p>
              <span className="text-micro text-fg-subtle tnum">{active.length} active</span>
            </div>

            {active.length === 0 ? (
              <p className="px-3 py-8 text-center text-meta text-fg-muted">Nothing needs your attention.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-line-subtle overflow-y-auto thin-scrollbar">
                {active.map((alert) => (
                  <li key={alert.id}>
                    <Link
                      to="/alerts"
                      onClick={() => setOpen(false)}
                      className="flex gap-2.5 px-3 py-2.5 transition-colors duration-150 hover:bg-surface-hover"
                    >
                      <span
                        className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', SEVERITY_DOT[alert.severity])}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-meta text-fg">{alert.title}</span>
                        <span className="mt-0.5 block truncate text-micro text-fg-subtle">
                          {alert.serverName} · {formatRelativeTime(alert.timestamp)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <Link
              to="/alerts"
              onClick={() => setOpen(false)}
              className="block border-t border-line px-3 py-2 text-center text-meta text-accent transition-colors duration-150 hover:bg-surface-hover"
            >
              View all alerts
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
