import { useEffect, useState } from 'react'
import { AresMark } from '@/components/brand/AresMark'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

interface BootScreenProps {
  onComplete: () => void
}

const HOLD_MS = 420
const FADE_MS = 160

/**
 * Connection splash shown once per session while the first fetch is in flight.
 *
 * Deliberately brief and static: the previous version ran a requestAnimationFrame
 * loop that called setState ~60 times a second to drive a fake progress bar and
 * a staged status message, which is a lot of work to make the app feel slower
 * than it is.
 */
export function BootScreen({ onComplete }: BootScreenProps) {
  const reduced = usePrefersReducedMotion()
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (reduced) {
      onComplete()
      return
    }
    const fade = window.setTimeout(() => setLeaving(true), HOLD_MS)
    const done = window.setTimeout(onComplete, HOLD_MS + FADE_MS)
    return () => {
      window.clearTimeout(fade)
      window.clearTimeout(done)
    }
  }, [onComplete, reduced])

  return (
    <div
      className="fixed inset-0 z-200 flex flex-col items-center justify-center bg-canvas transition-opacity duration-150 ease-out"
      style={{ opacity: leaving ? 0 : 1 }}
      role="status"
      aria-live="polite"
    >
      <AresMark size={32} className="text-fg" />
      <p className="mt-4 text-meta text-fg-muted">Connecting to control plane…</p>
      <div className="mt-4 h-px w-32 overflow-hidden bg-line">
        <div className="h-full w-1/3 animate-live bg-accent" />
      </div>
    </div>
  )
}
