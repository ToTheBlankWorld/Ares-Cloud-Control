import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { ToastContext, type ToastRecord, type ToastTone } from '@/components/ui/toast-context'
import { cn } from '@/lib/utils'

const TONE_ICON: Record<ToastTone, ReactNode> = {
  info: <Info className="size-4 text-accent" />,
  success: <CheckCircle2 className="size-4 text-success" />,
  warning: <AlertTriangle className="size-4 text-warning" />,
  error: <XCircle className="size-4 text-danger" />,
}

const AUTO_DISMISS_MS = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (toast: Omit<ToastRecord, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((current) => [...current.slice(-2), { ...toast, id }])
      timers.current.set(id, window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS))
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed right-0 bottom-0 z-100 flex w-full max-w-sm flex-col gap-2 p-4"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout="position"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16, ease: [0.2, 0, 0.13, 1] }}
              className={cn(
                'pointer-events-auto flex items-start gap-2.5 rounded-md border border-line bg-elevated p-3 shadow-popover',
              )}
            >
              <span className="mt-px shrink-0">{TONE_ICON[toast.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-meta font-medium text-fg">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-micro leading-relaxed text-fg-muted">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="-mt-0.5 -mr-0.5 shrink-0 rounded-sm p-1 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
