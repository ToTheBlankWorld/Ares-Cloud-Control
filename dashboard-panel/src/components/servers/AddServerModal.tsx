import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, SecretInput } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast-context'
import { dataSource } from '@/services'
import { cn } from '@/lib/utils'
import type { ConnectionTestResult, Server } from '@/types'

interface AddServerModalProps {
  open: boolean
  onClose: () => void
  onAdded: (server: Server) => void
}

type TestState =
  | { phase: 'idle' }
  | { phase: 'connecting' }
  | { phase: 'connected'; latencyMs: number; version: string }
  | { phase: 'failed'; message: string }

const EMPTY_FORM = { name: '', agentUrl: '', token: '' }

export function AddServerModal({ open, onClose, onAdded }: AddServerModalProps) {
  const { push } = useToast()
  const [form, setForm] = useState(EMPTY_FORM)
  const [test, setTest] = useState<TestState>({ phase: 'idle' })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({})

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM)
      setTest({ phase: 'idle' })
      setErrors({})
      setSubmitting(false)
    }
  }, [open])

  const set = useCallback(
    (key: keyof typeof EMPTY_FORM) => (value: string) => {
      setForm((current) => ({ ...current, [key]: value }))
      setErrors((current) => ({ ...current, [key]: undefined }))
      setTest({ phase: 'idle' })
    },
    [],
  )

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!form.name.trim()) next.name = 'Give this machine a name.'
    if (!form.agentUrl.trim()) next.agentUrl = 'The agent URL is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const runTest = async () => {
    if (!form.agentUrl.trim()) {
      setErrors((current) => ({ ...current, agentUrl: 'The agent URL is required.' }))
      return
    }
    setTest({ phase: 'connecting' })
    const result: ConnectionTestResult = await dataSource().testConnection(form.agentUrl.trim(), form.token)
    setTest(
      result.ok
        ? { phase: 'connected', latencyMs: result.latencyMs, version: result.version }
        : { phase: 'failed', message: result.message },
    )
  }

  const submit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const server = await dataSource().addServer({
        name: form.name.trim(),
        agentUrl: form.agentUrl.trim(),
        token: form.token,
      })
      onAdded(server)
      push({
        tone: 'success',
        title: `${server.name} connected`,
        description: 'The machine is now streaming metrics into ARES.',
      })
      onClose()
    } catch (error) {
      push({
        tone: 'error',
        title: 'Could not add server',
        description: error instanceof Error ? error.message : 'Unexpected failure.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add server"
      description="Point ARES at a running monitoring agent. Verify the connection before registering it."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={runTest} loading={test.phase === 'connecting'}>
            Test connection
          </Button>
          <Button variant="primary" onClick={submit} loading={submitting}>
            Add server
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Server name" error={errors.name} hint="Shown across the control center.">
          {(id) => (
            <Input
              id={id}
              value={form.name}
              onChange={(event) => set('name')(event.target.value)}
              placeholder="CXR Junior"
              autoComplete="off"
            />
          )}
        </Field>

        <Field
          label="Agent URL"
          error={errors.agentUrl}
          hint="A local address or a Cloudflare tunnel hostname."
        >
          {(id) => (
            <Input
              id={id}
              value={form.agentUrl}
              onChange={(event) => set('agentUrl')(event.target.value)}
              placeholder="https://example.trycloudflare.com"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          )}
        </Field>

        <Field label="API token" hint="Sent as a bearer token. Leave empty if the agent runs without auth.">
          {(id) => (
            <SecretInput
              id={id}
              value={form.token}
              onChange={(event) => set('token')(event.target.value)}
              placeholder="••••••••••••"
              autoComplete="off"
            />
          )}
        </Field>

        {/* Connection result: a left rule and one line of status, no animated panel. */}
        {test.phase !== 'idle' && (
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-md border border-line border-l-2 bg-inset px-3 py-2.5',
              test.phase === 'connecting' && 'border-l-line-strong',
              test.phase === 'connected' && 'border-l-success',
              test.phase === 'failed' && 'border-l-danger',
            )}
          >
            {test.phase === 'connecting' && <Loader2 className="mt-px size-4 shrink-0 animate-spin text-fg-subtle" />}
            {test.phase === 'connected' && <CheckCircle2 className="mt-px size-4 shrink-0 text-success" />}
            {test.phase === 'failed' && <XCircle className="mt-px size-4 shrink-0 text-danger" />}

            <div className="min-w-0">
              <p className="text-meta font-medium text-fg">
                {test.phase === 'connecting' && 'Connecting…'}
                {test.phase === 'connected' && 'Connected'}
                {test.phase === 'failed' && 'Connection failed'}
              </p>
              <p className="mt-0.5 text-micro leading-relaxed text-fg-muted">
                {test.phase === 'connecting' && 'Negotiating with the agent and verifying the token.'}
                {test.phase === 'connected' && `Agent v${test.version} responded in ${test.latencyMs}ms.`}
                {test.phase === 'failed' && test.message}
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
