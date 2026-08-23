import { memo, useId, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  className?: string
  color?: string
  filled?: boolean
}

/**
 * Dependency-free sparkline: pure geometry, no entrance animation.
 *
 * Server cards render one per machine and the fleet table one per row, so this
 * stays hand-rolled SVG rather than pulling Recharts into every row.
 */
function SparklineComponent({
  data,
  width = 120,
  height = 28,
  className,
  color = 'var(--color-accent)',
  filled = true,
}: SparklineProps) {
  const id = useId().replace(/:/g, '')

  const { line, area } = useMemo(() => {
    if (data.length < 2) return { line: '', area: '' }
    const min = Math.min(...data)
    const max = Math.max(...data)
    const span = max - min || 1
    const pad = 1.5
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = pad + (1 - (value - min) / span) * (height - pad * 2)
      return [x, y] as const
    })

    let d = `M ${points[0][0]} ${points[0][1]}`
    for (let i = 0; i < points.length - 1; i += 1) {
      const [x0, y0] = points[i]
      const [x1, y1] = points[i + 1]
      const cx = (x0 + x1) / 2
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`
    }

    return { line: d, area: `${d} L ${width} ${height} L 0 ${height} Z` }
  }, [data, width, height])

  if (!line) return <div className={className} style={{ height }} aria-hidden />

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full', className)}
      style={{ height }}
      aria-hidden
    >
      {filled && (
        <>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#spark-${id})`} />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export const Sparkline = memo(SparklineComponent)
