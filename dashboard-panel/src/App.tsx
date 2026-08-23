import { Suspense, lazy, useCallback, useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { AppLayout } from '@/components/layout/AppLayout'
import { BootScreen } from '@/components/common/BootScreen'
import { SettingsProvider } from '@/context/SettingsProvider'
import { useSettings } from '@/context/settings'
import { ToastProvider } from '@/components/ui/Toast'
import { PageContainer } from '@/components/layout/PageContainer'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { LandingPage } from '@/pages/Landing'

// Only the landing page ships in the entry chunk; the control center and its
// chart dependencies load on first navigation into it.
const DashboardPage = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.DashboardPage })))
const ServersPage = lazy(() => import('@/pages/Servers').then((m) => ({ default: m.ServersPage })))
const ServerDetailsPage = lazy(() =>
  import('@/pages/ServerDetails').then((m) => ({ default: m.ServerDetailsPage })),
)
const AlertsPage = lazy(() => import('@/pages/Alerts').then((m) => ({ default: m.AlertsPage })))
const SettingsPage = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.SettingsPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFoundPage })))
const MonitoringRedirect = lazy(() =>
  import('@/pages/Redirects').then((m) => ({ default: m.MonitoringRedirect })),
)
const ProcessesRedirect = lazy(() =>
  import('@/pages/Redirects').then((m) => ({ default: m.ProcessesRedirect })),
)

const BOOT_KEY = 'ares.booted'

function RouteFallback() {
  return (
    <PageContainer wide>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </PageContainer>
  )
}

/** Scrolls to the top on navigation, matching native page behaviour. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

/**
 * Bridges the in-app "Reduce motion" preference into Motion, so the setting
 * disables JS-driven transitions the same way the CSS rule disables the
 * transition-based ones.
 */
function MotionPreference({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  return <MotionConfig reducedMotion={settings.reduceMotion ? 'always' : 'user'}>{children}</MotionConfig>
}

export default function App() {
  const location = useLocation()
  const isControlCenter = location.pathname !== '/'

  const [booted, setBooted] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      return window.sessionStorage.getItem(BOOT_KEY) === '1'
    } catch {
      return true
    }
  })

  const completeBoot = useCallback(() => {
    try {
      window.sessionStorage.setItem(BOOT_KEY, '1')
    } catch {
      /* storage unavailable — the sequence simply replays next visit */
    }
    setBooted(true)
  }, [])

  return (
    <SettingsProvider>
      <MotionPreference>
        <ToastProvider>
          <ScrollToTop />
          {isControlCenter && !booted && <BootScreen onComplete={completeBoot} />}

          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />

              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/servers" element={<ServersPage />} />
                <Route path="/servers/:id" element={<ServerDetailsPage />} />
                <Route path="/monitoring" element={<MonitoringRedirect />} />
                <Route path="/processes" element={<ProcessesRedirect />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              <Route path="/index.html" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </MotionPreference>
    </SettingsProvider>
  )
}
