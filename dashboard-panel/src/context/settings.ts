import { createContext, useContext } from 'react'

export type ThemeMode = 'dark' | 'light' | 'system'
export type AccentKey = 'blue' | 'indigo' | 'teal' | 'slate'

export interface AccentDefinition {
  key: AccentKey
  label: string
  /**
   * Written onto the document root at runtime. Deliberately narrow: the accent
   * is one hue with a hover and a pressed step, never a rainbow ramp.
   */
  tokens: { base: string; hover: string; strong: string; soft: string; fg: string }
}

export const ACCENTS: AccentDefinition[] = [
  {
    key: 'blue',
    label: 'Ares Blue',
    tokens: { base: '#4d8dff', hover: '#6ba0ff', strong: '#2f6fe4', soft: '#4d8dff1f', fg: '#06070a' },
  },
  {
    key: 'indigo',
    label: 'Indigo',
    tokens: { base: '#7c8cf8', hover: '#95a2fa', strong: '#5b6ce0', soft: '#7c8cf81f', fg: '#06070a' },
  },
  {
    key: 'teal',
    label: 'Teal',
    tokens: { base: '#3fb3b8', hover: '#57c6cb', strong: '#2b9195', soft: '#3fb3b81f', fg: '#06070a' },
  },
  {
    key: 'slate',
    label: 'Graphite',
    tokens: { base: '#8b94a3', hover: '#a3abb8', strong: '#6d7684', soft: '#8b94a31f', fg: '#06070a' },
  },
]

export interface NotificationSettings {
  critical: boolean
  warning: boolean
  info: boolean
  sound: boolean
  desktop: boolean
}

export interface MonitoringSettings {
  /** Seconds between metric polls. */
  refreshInterval: number
  cpuThreshold: number
  memoryThreshold: number
  diskThreshold: number
  retentionDays: number
}

export interface AresSettings {
  theme: ThemeMode
  accent: AccentKey
  compactDensity: boolean
  /** Disables all non-essential motion regardless of the OS setting. */
  reduceMotion: boolean
  notifications: NotificationSettings
  monitoring: MonitoringSettings
}

export const DEFAULT_SETTINGS: AresSettings = {
  theme: 'dark',
  accent: 'blue',
  compactDensity: false,
  reduceMotion: false,
  notifications: { critical: true, warning: true, info: false, sound: false, desktop: true },
  monitoring: {
    refreshInterval: 5,
    cpuThreshold: 90,
    memoryThreshold: 80,
    diskThreshold: 90,
    retentionDays: 30,
  },
}

export interface SettingsContextValue {
  settings: AresSettings
  update: (patch: Partial<AresSettings>) => void
  updateNotifications: (patch: Partial<NotificationSettings>) => void
  updateMonitoring: (patch: Partial<MonitoringSettings>) => void
  reset: () => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>')
  return context
}
