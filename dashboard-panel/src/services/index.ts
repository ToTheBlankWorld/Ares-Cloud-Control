import { apiService } from '@/services/apiService'
import { getDataSourceMode } from '@/services/agentConfig'
import { mockService } from '@/services/mockService'
import type { AresDataSource } from '@/types'

/**
 * Single entry point for data access. Every component and hook imports
 * `dataSource()` rather than a concrete service, so flipping
 * `VITE_DATA_SOURCE` (or the runtime toggle in Settings) is the only change
 * required to go live against the Rust agent.
 */
export function dataSource(): AresDataSource {
  return getDataSourceMode() === 'api' ? apiService : mockService
}

export { apiService, mockService }
export * from '@/services/agentConfig'
