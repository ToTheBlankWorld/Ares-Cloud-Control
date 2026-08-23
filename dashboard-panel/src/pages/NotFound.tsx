import { Link } from 'react-router-dom'
import { AresMark } from '@/components/brand/AresMark'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
      <AresMark size={28} className="text-fg" />
      <p className="mt-6 label uppercase">Error 404</p>
      <h1 className="mt-2 text-display font-semibold text-fg">Route not found</h1>
      <p className="mt-2 max-w-sm text-meta leading-relaxed text-fg-muted">
        This path is not part of the control plane. It may have been renamed, or the link is stale.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex h-8 items-center rounded-md border border-line px-3 text-meta text-fg-muted transition-colors duration-150 hover:border-line-strong hover:text-fg"
      >
        Back to overview
      </Link>
    </div>
  )
}
