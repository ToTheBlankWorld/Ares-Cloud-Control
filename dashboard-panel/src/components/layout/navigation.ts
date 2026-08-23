import { Activity, Bell, Cpu, LayoutGrid, Server, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Matches nested routes (e.g. /servers/:id) for the active state. */
  matchPrefix?: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Control',
    items: [
      { label: 'Overview', to: '/dashboard', icon: LayoutGrid },
      { label: 'Servers', to: '/servers', icon: Server, matchPrefix: '/servers' },
      { label: 'Monitoring', to: '/monitoring', icon: Activity },
      { label: 'Processes', to: '/processes', icon: Cpu },
      { label: 'Alerts', to: '/alerts', icon: Bell },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', to: '/settings', icon: Settings, matchPrefix: '/settings' }],
  },
]

export const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: 'Overview',
  servers: 'Servers',
  monitoring: 'Monitoring',
  processes: 'Processes',
  alerts: 'Alerts',
  settings: 'Settings',
}
