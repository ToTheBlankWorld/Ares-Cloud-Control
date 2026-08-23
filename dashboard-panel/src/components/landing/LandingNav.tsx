import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { AresLogo } from '@/components/brand/AresLogo'
import { cn } from '@/lib/utils'

const LINKS = [
  { label: 'Overview', href: '#infrastructure' },
  { label: 'Monitoring', href: '#monitoring' },
  { label: 'Security', href: '#security' },
  { label: 'Architecture', href: '#architecture' },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200',
        scrolled ? 'border-line bg-canvas/95' : 'border-transparent',
      )}
    >
      <div className="mx-auto flex h-14 max-w-[76rem] items-center justify-between px-4 md:px-6">
        <Link to="/" aria-label="ARES Cloud Control">
          <AresLogo size={22} />
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-sm px-2.5 py-1.5 text-meta text-fg-muted transition-colors duration-150 hover:text-fg"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="hidden h-8 items-center rounded-md bg-accent px-3 text-meta font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover sm:inline-flex"
          >
            Open console
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="rounded-sm p-1.5 text-fg-muted transition-colors duration-150 hover:text-fg md:hidden"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav aria-label="Sections" className="border-t border-line bg-surface md:hidden">
          <div className="space-y-0.5 px-4 py-3">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-sm px-2 py-2 text-meta text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/dashboard"
              className="mt-2 flex h-9 items-center justify-center rounded-md bg-accent text-meta font-medium text-accent-fg"
            >
              Open console
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
