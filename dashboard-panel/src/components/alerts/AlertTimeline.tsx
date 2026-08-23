import { Fragment, memo, useMemo } from 'react'
import { AlertCard } from '@/components/alerts/AlertCard'
import { cn } from '@/lib/utils'
import type { Alert } from '@/types'

interface AlertTimelineProps {
  alerts: Alert[]
  className?: string
}

/** Groups alerts into Today / Yesterday / Earlier buckets. */
function bucketFor(iso: string): string {
  const now = new Date()
  const then = new Date(iso)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dayMs = 86_400_000
  if (then.getTime() >= startOfToday) return 'Today'
  if (then.getTime() >= startOfToday - dayMs) return 'Yesterday'
  return 'Earlier'
}

/**
 * Date-grouped list. The decorative vertical rail and per-item slide-in are
 * gone: the group headings already do the grouping work.
 */
function AlertTimelineComponent({ alerts, className }: AlertTimelineProps) {
  const groups = useMemo(() => {
    const map = new Map<string, Alert[]>()
    for (const alert of alerts) {
      const bucket = bucketFor(alert.timestamp)
      map.set(bucket, [...(map.get(bucket) ?? []), alert])
    }
    return ['Today', 'Yesterday', 'Earlier']
      .filter((key) => map.has(key))
      .map((key) => ({ key, items: map.get(key)! }))
  }, [alerts])

  return (
    <div className={cn('space-y-6', className)}>
      {groups.map((group) => (
        <Fragment key={group.key}>
          <section>
            <h2 className="label mb-2 uppercase">
              {group.key}
              <span className="ml-2 tnum">{group.items.length}</span>
            </h2>
            <ul className="space-y-2">
              {group.items.map((alert) => (
                <li key={alert.id}>
                  <AlertCard alert={alert} />
                </li>
              ))}
            </ul>
          </section>
        </Fragment>
      ))}
    </div>
  )
}

export const AlertTimeline = memo(AlertTimelineComponent)
