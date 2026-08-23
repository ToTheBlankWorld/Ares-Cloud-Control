import { dataSource } from '@/services'
import { useAsync, type AsyncState } from '@/hooks/useAsync'
import type { Alert, MetricsSnapshot, SeriesPoint, Server, TimeRange } from '@/types'

export function useServers(): AsyncState<Server[]> {
  return useAsync(() => dataSource().listServers(), [])
}

export function useServer(id: string | undefined): AsyncState<Server | null> {
  return useAsync(() => (id ? dataSource().getServer(id) : Promise.resolve(null)), [id])
}

export function useMetrics(serverId: string | undefined): AsyncState<MetricsSnapshot> {
  return useAsync(
    () => (serverId ? dataSource().getMetrics(serverId) : Promise.reject(new Error('No server selected'))),
    [serverId],
  )
}

export function useSeries(serverId: string | undefined, range: TimeRange): AsyncState<SeriesPoint[]> {
  return useAsync(
    () => (serverId ? dataSource().getSeries(serverId, range) : Promise.resolve([])),
    [serverId, range],
  )
}

export function useAlerts(): AsyncState<Alert[]> {
  return useAsync(() => dataSource().listAlerts(), [])
}
