import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ACCENTS,
  DEFAULT_SETTINGS,
  SettingsContext,
  type AresSettings,
  type MonitoringSettings,
  type NotificationSettings,
} from '@/context/settings'

const STORAGE_KEY = 'ares.settings'

function load(): AresSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AresSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
      monitoring: { ...DEFAULT_SETTINGS.monitoring, ...parsed.monitoring },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** Applies theme, accent and density to the document root. */
function applyToDocument(settings: AresSettings): void {
  const root = document.documentElement
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
  const isLight = settings.theme === 'light' || (settings.theme === 'system' && prefersLight)

  root.classList.toggle('theme-light', isLight)
  root.dataset.density = settings.compactDensity ? 'compact' : 'comfortable'
  root.dataset.motion = settings.reduceMotion ? 'reduced' : 'full'

  const accent = ACCENTS.find((a) => a.key === settings.accent) ?? ACCENTS[0]
  root.style.setProperty('--color-accent', accent.tokens.base)
  root.style.setProperty('--color-accent-hover', accent.tokens.hover)
  root.style.setProperty('--color-accent-strong', accent.tokens.strong)
  root.style.setProperty('--color-accent-soft', accent.tokens.soft)
  root.style.setProperty('--color-accent-fg', accent.tokens.fg)
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AresSettings>(load)

  useEffect(() => {
    applyToDocument(settings)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* storage unavailable — settings stay in memory for this session */
    }
  }, [settings])

  // Track the OS preference while the user is on "System".
  useEffect(() => {
    if (settings.theme !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applyToDocument(settings)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [settings])

  const update = useCallback((patch: Partial<AresSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const updateNotifications = useCallback((patch: Partial<NotificationSettings>) => {
    setSettings((current) => ({ ...current, notifications: { ...current.notifications, ...patch } }))
  }, [])

  const updateMonitoring = useCallback((patch: Partial<MonitoringSettings>) => {
    setSettings((current) => ({ ...current, monitoring: { ...current.monitoring, ...patch } }))
  }, [])

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  const value = useMemo(
    () => ({ settings, update, updateNotifications, updateMonitoring, reset }),
    [settings, update, updateNotifications, updateMonitoring, reset],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
