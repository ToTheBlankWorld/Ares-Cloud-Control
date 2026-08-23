import { AresMark } from '@/components/brand/AresMark'
import { cn } from '@/lib/utils'

interface AresLogoProps {
  className?: string
  size?: number
  /** Hides the wordmark — used by the collapsed sidebar. */
  markOnly?: boolean
}

/**
 * Wordmark lockup. "ARES" carries the weight; "Cloud Control" is the product
 * descriptor set quietly beneath it in sentence case.
 */
export function AresLogo({ className, size = 22, markOnly = false }: AresLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <AresMark size={size} className="text-fg" />
      {!markOnly && (
        <div className="min-w-0 leading-none">
          <div className="text-heading font-semibold tracking-tight text-fg">ARES</div>
          <div className="mt-1 text-micro leading-none text-fg-subtle">Cloud Control</div>
        </div>
      )}
    </div>
  )
}
