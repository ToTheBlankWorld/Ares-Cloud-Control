import { Navigate } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { EmptyState } from '@/components/ui/States'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useServers } from '@/hooks/useAresData'

/**
 * `Monitoring` and `Processes` are views of a single host rather than pages of
 * their own, so both resolve to the first reporting machine.
 */
function usePrimaryServerId(): { id: string | null; loading: boolean } {
  const { data, loading } = useServers()
  const servers = data ?? []
  const primary = servers.find((s) => s.status === 'online') ?? servers[0]
  return { id: primary?.id ?? null, loading }
}

function Resolving() {
  return (
    <PageContainer wide>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </PageContainer>
  )
}

function NoHost({ label }: { label: string }) {
  return (
    <PageContainer>
      <EmptyState
        title="No host to monitor"
        description={`Connect a machine to open the ${label} view. Every registered agent gets its own detailed panels.`}
      />
    </PageContainer>
  )
}

export function MonitoringRedirect() {
  const { id, loading } = usePrimaryServerId()
  if (loading) return <Resolving />
  if (!id) return <NoHost label="monitoring" />
  return <Navigate to={`/servers/${id}`} replace />
}

export function ProcessesRedirect() {
  const { id, loading } = usePrimaryServerId()
  if (loading) return <Resolving />
  if (!id) return <NoHost label="process" />
  return <Navigate to={`/servers/${id}?panel=processes`} replace />
}
