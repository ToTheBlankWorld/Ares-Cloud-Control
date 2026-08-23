import { cn } from '@/lib/utils'

/**
 * Loading placeholder. A slow opacity pulse — no travelling shimmer gradient,
 * which was both decorative and a per-frame paint on every skeleton at once.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-skeleton rounded-sm bg-surface-active', className)} />
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-line bg-surface p-4', className)} aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="mt-4 h-7 w-24" />
      <Skeleton className="mt-4 h-12 w-full" />
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Skeleton className="h-6" />
        <Skeleton className="h-6" />
        <Skeleton className="h-6" />
      </div>
    </div>
  )
}

export function SkeletonRows({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('divide-y divide-line-subtle', className)} aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}
