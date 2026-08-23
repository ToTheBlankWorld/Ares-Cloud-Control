import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Side = 'top' | 'bottom' | 'right' | 'left'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: Side
  /** Classes for the tooltip bubble. */
  className?: string
  /** Classes for the wrapper that hosts the trigger — use to control its width. */
  triggerClassName?: string
  delay?: number
}

const POSITION: Record<Side, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
}

/**
 * Hover and focus tooltip. Plain conditional render with a CSS fade — no
 * presence animation, because tooltips fire constantly while pointing around a
 * dense table and each one was mounting an animation.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  className,
  triggerClassName,
  delay = 200,
}: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timer = useRef(0)
  const id = useId()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const show = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setVisible(true), delay)
  }
  const hide = () => {
    window.clearTimeout(timer.current)
    setVisible(false)
  }

  return (
    <span
      className={cn('relative inline-flex', triggerClassName)}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={visible ? id : undefined}
    >
      {children}
      {visible && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-90 w-max max-w-60 rounded-md border border-line bg-elevated px-2 py-1',
            'text-micro leading-snug text-fg shadow-popover',
            'motion-safe:animate-[ares-fade-in_120ms_var(--ease-standard)_both]',
            POSITION[side],
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}
