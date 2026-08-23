import { Tabs } from '@/components/ui/Tabs'
import { TIME_RANGES } from '@/data/mockData'
import type { TimeRange } from '@/types'

interface TimeRangeControlProps {
  value: TimeRange
  onChange: (value: TimeRange) => void
  className?: string
}

export function TimeRangeControl({ value, onChange, className }: TimeRangeControlProps) {
  return (
    <Tabs
      variant="segmented"
      className={className}
      value={value}
      onChange={onChange}
      items={TIME_RANGES.map((range) => ({ value: range.value, label: range.label }))}
    />
  )
}
