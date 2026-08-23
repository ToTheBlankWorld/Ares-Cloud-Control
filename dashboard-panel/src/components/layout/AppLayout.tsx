import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { useServers } from '@/hooks/useAresData'

const COLLAPSE_KEY = 'ares.sidebar.collapsed'

export function AppLayout() {
  const location = useLocation()
  const { data: servers } = useServers()

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(COLLAPSE_KEY) === '1'
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const toggleCollapse = useCallback(() => {
    setCollapsed((current) => {
      const next = !current
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* storage unavailable — collapse state stays per-session */
      }
      return next
    })
  }, [])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const openSearch = useCallback(() => setPaletteOpen(true), [])
  const closeSearch = useCallback(() => setPaletteOpen(false), [])

  // Ctrl/Cmd+K opens the palette from anywhere in the control center.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-200 ease-out lg:block ${
          collapsed ? 'w-13' : 'w-56'
        }`}
      >
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>

      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-90 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={closeDrawer}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0.13, 1] }}
              className="absolute inset-y-0 left-0"
            >
              <Sidebar collapsed={false} variant="drawer" onToggleCollapse={toggleCollapse} onNavigate={closeDrawer} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar servers={servers ?? []} onOpenDrawer={openDrawer} onOpenSearch={openSearch} />

        {/*
          Route content fades in via CSS keyed on the pathname. The previous
          AnimatePresence `mode="wait"` held the incoming route until the
          outgoing one finished animating out, which read as navigation lag.
        */}
        <main key={location.pathname} className="route-enter min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={closeSearch} servers={servers ?? []} />
    </div>
  )
}
