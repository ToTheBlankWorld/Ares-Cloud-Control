import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

interface CounterProps {
  value: number
  decimals?: number
  suffix?: string
  prefix?: string
  className?: string
}

const easeOut = (t: number) => 1 - (1 - t) ** 3
const DURATION = 420

/**
 * Animated metric readout.
 *
 * The tween writes straight to the DOM node rather than through state, so a
 * screen full of counters costs zero React renders while it runs. Reused
 * across renders: when the value changes it eases from the previous number.
 */
export function Counter({ value, decimals = 0, suffix, prefix, className }: CounterProps) {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const from = useRef(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const write = (n: number) => {
      node.textContent = `${prefix ?? ''}${n.toFixed(decimals)}${suffix ?? ''}`
    }

    if (reduced) {
      from.current = value
      write(value)
      return
    }

    const start = performance.now()
    const origin = from.current
    let frame = 0

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION)
      write(origin + (value - origin) * easeOut(progress))
      if (progress < 1) {
        frame = requestAnimationFrame(step)
      } else {
        from.current = value
      }
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, decimals, prefix, suffix, reduced])

  return (
    <span ref={ref} className={cn('tnum', className)}>
      {/* Server-safe initial paint; the effect takes over immediately. */}
      {`${prefix ?? ''}${(0).toFixed(decimals)}${suffix ?? ''}`}
    </span>
  )
}
