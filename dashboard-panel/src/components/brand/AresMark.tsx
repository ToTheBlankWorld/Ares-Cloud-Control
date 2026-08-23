import { cn } from '@/lib/utils'

interface AresMarkProps {
  size?: number
  className?: string
  title?: string
}

const HEX = 'M20 3.4 L34.4 11.7 V28.3 L20 36.6 L5.6 28.3 V11.7 Z'
const APEX = 'M13.2 28.9 L20 11.8 L26.8 28.9'
const CROSSBAR = 'M16.4 23.4 H23.6'

/**
 * The ARES command-core mark: a hexagonal containment frame around a
 * geometric "A". Static — the stroke-drawing animation was a title-sequence
 * effect that did not belong in an operations tool.
 */
export function AresMark({ size = 24, className, title = 'ARES' }: AresMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label={title}
      className={cn('shrink-0', className)}
    >
      <path d={HEX} stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" />
      <path d={APEX} stroke="currentColor" strokeWidth={2.9} strokeLinecap="round" strokeLinejoin="round" />
      <path d={CROSSBAR} stroke="var(--color-accent)" strokeWidth={2.6} strokeLinecap="round" />
    </svg>
  )
}
