import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CornerDownLeft, Search } from 'lucide-react'
import { NAV_GROUPS } from '@/components/layout/navigation'
import { StatusDot } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Server } from '@/types'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  servers: Server[]
}

interface Command {
  id: string
  label: string
  group: string
  hint?: string
  to: string
  status?: Server['status']
}

export function CommandPalette({ open, onClose, servers }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)

  const commands = useMemo<Command[]>(() => {
    const pages = NAV_GROUPS.flatMap((group) =>
      group.items.map((item) => ({
        id: `page-${item.to}`,
        label: item.label,
        group: 'Navigate',
        to: item.to,
      })),
    )
    const machines = servers.map((server) => ({
      id: `server-${server.id}`,
      label: server.name,
      group: 'Servers',
      hint: `${server.os} · ${server.region}`,
      to: `/servers/${server.id}`,
      status: server.status,
    }))
    return [...pages, ...machines]
  }, [servers])

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return commands
    return commands.filter(
      (command) =>
        command.label.toLowerCase().includes(needle) || command.hint?.toLowerCase().includes(needle),
    )
  }, [commands, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
    }
  }, [open])

  useEffect(() => {
    setCursor((current) => Math.min(current, Math.max(0, results.length - 1)))
  }, [results.length])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setCursor((c) => (results.length === 0 ? 0 : (c + 1) % results.length))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setCursor((c) => (results.length === 0 ? 0 : (c - 1 + results.length) % results.length))
      } else if (event.key === 'Enter' && results[cursor]) {
        event.preventDefault()
        navigate(results[cursor].to)
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, results, cursor, navigate, onClose])

  let lastGroup = ''

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-100 flex items-start justify-center px-4 pt-[14vh]">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.2, 0, 0.13, 1] }}
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-line bg-elevated shadow-popover"
          >
            <div className="flex items-center gap-2.5 border-b border-line px-3">
              <Search className="size-4 shrink-0 text-fg-subtle" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search servers and pages…"
                aria-label="Search"
                className="h-11 w-full bg-transparent text-body text-fg placeholder:text-fg-subtle focus:outline-none"
              />
              <kbd className="shrink-0 rounded-xs bg-surface-active px-1.5 py-0.5 text-micro text-fg-subtle">Esc</kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-1.5 thin-scrollbar">
              {results.length === 0 ? (
                <p className="px-3 py-10 text-center text-meta text-fg-muted">No matches for “{query}”.</p>
              ) : (
                results.map((command, index) => {
                  const showGroup = command.group !== lastGroup
                  lastGroup = command.group
                  const active = index === cursor
                  return (
                    <div key={command.id}>
                      {showGroup && <p className="label px-2 pt-2.5 pb-1 uppercase">{command.group}</p>}
                      <button
                        type="button"
                        onPointerEnter={() => setCursor(index)}
                        onClick={() => {
                          navigate(command.to)
                          onClose()
                        }}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors duration-100',
                          active ? 'bg-surface-active text-fg' : 'text-fg-muted',
                        )}
                      >
                        {command.status && <StatusDot status={command.status} live={false} />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-meta">{command.label}</span>
                          {command.hint && (
                            <span className="block truncate text-micro text-fg-subtle">{command.hint}</span>
                          )}
                        </span>
                        {active && <CornerDownLeft className="size-3.5 shrink-0 text-fg-subtle" />}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
