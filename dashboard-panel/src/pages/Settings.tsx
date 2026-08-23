import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Info, Monitor, Moon, Palette, Plug, Radar, Server, ShieldCheck, Sun } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/PageContainer'
import { SettingsSidebar, type SettingsTab } from '@/components/settings/SettingsSidebar'
import { SettingsRow, SettingsSection } from '@/components/settings/SettingsSection'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dropdown } from '@/components/ui/Dropdown'
import { Field, Input, SecretInput, Toggle } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast-context'
import { ACCENTS, useSettings, type AccentKey, type ThemeMode } from '@/context/settings'
import {
  dataSource,
  getAgentCredentials,
  getDataSourceMode,
  setAgentCredentials,
  setDataSourceMode,
  type DataSourceMode,
} from '@/services'
import { cn } from '@/lib/utils'

type SectionKey = 'connection' | 'servers' | 'appearance' | 'security' | 'monitoring' | 'application'

const TABS: SettingsTab<SectionKey>[] = [
  { value: 'connection', label: 'Connection', icon: Plug },
  { value: 'servers', label: 'Servers', icon: Server },
  { value: 'appearance', label: 'Appearance', icon: Palette },
  { value: 'security', label: 'Security', icon: ShieldCheck },
  { value: 'monitoring', label: 'Monitoring', icon: Radar },
  { value: 'application', label: 'Application', icon: Info },
]

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
]

export function SettingsPage() {
  const { settings, update, updateNotifications, updateMonitoring, reset } = useSettings()
  const { push } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const requested = searchParams.get('section') as SectionKey | null
  const section: SectionKey = TABS.some((tab) => tab.value === requested) ? requested! : 'connection'
  const setSection = useCallback(
    (value: SectionKey) => {
      const next = new URLSearchParams(searchParams)
      next.set('section', value)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const credentials = getAgentCredentials()
  const [agentUrl, setAgentUrl] = useState(credentials.baseUrl ?? '')
  const [token, setToken] = useState(credentials.token ?? '')
  const [mode, setMode] = useState<DataSourceMode>(getDataSourceMode())
  const [testing, setTesting] = useState(false)

  const saveConnection = () => {
    setAgentCredentials(agentUrl, token)
    setDataSourceMode(mode)
    push({
      tone: 'success',
      title: 'Connection saved',
      description:
        mode === 'api'
          ? 'ARES will query the agent on the next data load.'
          : 'The dashboard stays on sample data.',
    })
  }

  const testConnection = async () => {
    setTesting(true)
    const result = await dataSource().testConnection(agentUrl, token)
    setTesting(false)
    push(
      result.ok
        ? {
            tone: 'success',
            title: 'Agent reachable',
            description: `v${result.version} responded in ${result.latencyMs}ms.`,
          }
        : { tone: 'error', title: 'Connection failed', description: result.message },
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Configure how ARES connects, what it watches and how it looks."
        actions={
          <Button variant="ghost" onClick={reset}>
            Reset to defaults
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <SettingsSidebar
          tabs={TABS}
          value={section}
          onChange={setSection}
          className="lg:sticky lg:top-16 lg:self-start"
        />

        <div className="min-w-0 max-w-3xl space-y-6">
          {section === 'connection' && (
            <>
              <SettingsSection
                title="Data source"
                description="ARES ships with sample telemetry so the interface is fully explorable before an agent is attached."
                actions={
                  <Badge tone={mode === 'api' ? 'success' : 'neutral'}>
                    {mode === 'api' ? 'Live agent' : 'Sample data'}
                  </Badge>
                }
              >
                <SettingsRow
                  label="Active source"
                  description="Switch to the live agent once a reachable URL is configured below."
                >
                  <Dropdown<DataSourceMode>
                    value={mode}
                    onChange={setMode}
                    items={[
                      { value: 'mock', label: 'Sample data', description: 'No backend required' },
                      { value: 'api', label: 'Live agent', description: 'Queries the ARES agent' },
                    ]}
                  />
                </SettingsRow>
              </SettingsSection>

              <SettingsSection
                title="Agent endpoint"
                description="The agent is reached over a Cloudflare tunnel whose hostname rotates. Update it here whenever the tunnel restarts."
                actions={
                  <>
                    <Button loading={testing} onClick={testConnection}>
                      Test connection
                    </Button>
                    <Button variant="primary" onClick={saveConnection}>
                      Save
                    </Button>
                  </>
                }
              >
                <div className="space-y-4">
                  <Field label="Agent URL" hint="Overrides the VITE_AGENT_URL build variable for this browser.">
                    {(id) => (
                      <Input
                        id={id}
                        value={agentUrl}
                        onChange={(event) => setAgentUrl(event.target.value)}
                        placeholder="https://example.trycloudflare.com"
                        spellCheck={false}
                        className="font-mono"
                      />
                    )}
                  </Field>
                  <Field label="API token" hint="Stored in this browser only and sent as a bearer token.">
                    {(id) => (
                      <SecretInput
                        id={id}
                        value={token}
                        onChange={(event) => setToken(event.target.value)}
                        placeholder="••••••••••••"
                      />
                    )}
                  </Field>
                </div>
              </SettingsSection>
            </>
          )}

          {section === 'servers' && (
            <SettingsSection
              title="Notifications"
              description="Which server events reach you, and how they are delivered."
            >
              <Toggle
                label="Critical alerts"
                description="Server disconnects and threshold breaches above the critical line."
                checked={settings.notifications.critical}
                onChange={(checked) => updateNotifications({ critical: checked })}
              />
              <Toggle
                label="Warning alerts"
                description="Sustained elevated usage that has not yet become critical."
                checked={settings.notifications.warning}
                onChange={(checked) => updateNotifications({ warning: checked })}
              />
              <Toggle
                label="Informational events"
                description="Agent upgrades, new filesystems, collector state changes."
                checked={settings.notifications.info}
                onChange={(checked) => updateNotifications({ info: checked })}
              />
              <Toggle
                label="Desktop notifications"
                description="Surface alerts through the browser while ARES is open."
                checked={settings.notifications.desktop}
                onChange={(checked) => updateNotifications({ desktop: checked })}
              />
              <Toggle
                label="Sound"
                description="Play a short tone when a critical alert fires."
                checked={settings.notifications.sound}
                onChange={(checked) => updateNotifications({ sound: checked })}
              />
            </SettingsSection>
          )}

          {section === 'appearance' && (
            <>
              <SettingsSection
                title="Theme"
                description="ARES is designed dark-first. The light theme is a muted daytime counterpart."
              >
                <div className="flex flex-wrap gap-2">
                  {THEME_OPTIONS.map((option) => {
                    const Icon = option.icon
                    const active = settings.theme === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => update({ theme: option.value })}
                        aria-pressed={active}
                        className={cn(
                          'flex h-8 items-center gap-2 rounded-md border px-3 text-meta transition-colors duration-150',
                          active
                            ? 'border-accent bg-accent-soft text-fg'
                            : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                        )}
                      >
                        <Icon className="size-3.5" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </SettingsSection>

              <SettingsSection
                title="Accent"
                description="Applied to primary actions, chart lines and active navigation. Status colours are fixed."
              >
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((accent) => {
                    const active = settings.accent === accent.key
                    return (
                      <button
                        key={accent.key}
                        type="button"
                        onClick={() => update({ accent: accent.key as AccentKey })}
                        aria-pressed={active}
                        className={cn(
                          'flex h-8 items-center gap-2 rounded-md border px-3 text-meta transition-colors duration-150',
                          active
                            ? 'border-line-strong bg-surface-active text-fg'
                            : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                        )}
                      >
                        <span className="size-3 rounded-xs" style={{ background: accent.tokens.base }} />
                        {accent.label}
                      </button>
                    )
                  })}
                </div>
              </SettingsSection>

              <SettingsSection title="Interface" description="Density and motion.">
                <Toggle
                  label="Compact density"
                  description="Tightens spacing in tables and lists for dense monitoring sessions."
                  checked={settings.compactDensity}
                  onChange={(checked) => update({ compactDensity: checked })}
                />
                <Toggle
                  label="Reduce motion"
                  description="Disables transitions and the live status pulse, regardless of the OS setting."
                  checked={settings.reduceMotion}
                  onChange={(checked) => update({ reduceMotion: checked })}
                />
              </SettingsSection>
            </>
          )}

          {section === 'security' && (
            <>
              <SettingsSection
                title="Access"
                description="ARES authenticates against each agent with a bearer token issued on the host."
              >
                <SettingsRow label="Token storage" description="Tokens never leave this browser and are not synced.">
                  <Badge tone="success">Local only</Badge>
                </SettingsRow>
                <SettingsRow label="Transport" description="Tunnelled endpoints are served over TLS by Cloudflare.">
                  <Badge tone="accent">HTTPS enforced</Badge>
                </SettingsRow>
                <SettingsRow
                  label="Clear stored credentials"
                  description="Removes the saved agent URL and token from this browser."
                >
                  <Button
                    variant="danger"
                    onClick={() => {
                      setAgentUrl('')
                      setToken('')
                      setAgentCredentials('', '')
                      push({ tone: 'warning', title: 'Credentials cleared' })
                    }}
                  >
                    Clear credentials
                  </Button>
                </SettingsRow>
              </SettingsSection>

              <SettingsSection
                title="Agent hardening"
                description="Recommended configuration for the ARES agent on each host."
              >
                <ul className="space-y-2 text-meta leading-relaxed text-fg-muted">
                  <li>Bind the agent to 127.0.0.1 and expose it only through the tunnel.</li>
                  <li>Store the token in a root-owned file with mode 0600.</li>
                  <li>Rotate the token whenever a tunnel hostname is shared outside the team.</li>
                  <li>Run the agent under a dedicated unprivileged user with a systemd unit.</li>
                </ul>
              </SettingsSection>
            </>
          )}

          {section === 'monitoring' && (
            <>
              <SettingsSection title="Collection" description="How often ARES pulls a fresh snapshot from each agent.">
                <SettingsRow label="Refresh interval" description="The agent itself collects roughly once per second.">
                  <Dropdown<string>
                    value={String(settings.monitoring.refreshInterval)}
                    onChange={(value) => updateMonitoring({ refreshInterval: Number(value) })}
                    items={[
                      { value: '2', label: 'Every 2 seconds' },
                      { value: '5', label: 'Every 5 seconds' },
                      { value: '15', label: 'Every 15 seconds' },
                      { value: '60', label: 'Every minute' },
                    ]}
                  />
                </SettingsRow>
                <SettingsRow label="Retention" description="How long chart history is kept in the browser.">
                  <Dropdown<string>
                    value={String(settings.monitoring.retentionDays)}
                    onChange={(value) => updateMonitoring({ retentionDays: Number(value) })}
                    items={[
                      { value: '7', label: '7 days' },
                      { value: '30', label: '30 days' },
                      { value: '90', label: '90 days' },
                    ]}
                  />
                </SettingsRow>
              </SettingsSection>

              <SettingsSection title="Thresholds" description="The point at which a metric is promoted to critical.">
                {[
                  {
                    label: 'CPU',
                    description: 'Sustained total utilisation.',
                    value: settings.monitoring.cpuThreshold,
                    apply: (cpuThreshold: number) => updateMonitoring({ cpuThreshold }),
                  },
                  {
                    label: 'Memory',
                    description: 'Resident memory against installed total.',
                    value: settings.monitoring.memoryThreshold,
                    apply: (memoryThreshold: number) => updateMonitoring({ memoryThreshold }),
                  },
                  {
                    label: 'Disk',
                    description: 'Any monitored filesystem.',
                    value: settings.monitoring.diskThreshold,
                    apply: (diskThreshold: number) => updateMonitoring({ diskThreshold }),
                  },
                ].map((item) => (
                  <SettingsRow key={item.label} label={item.label} description={item.description}>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={50}
                        max={99}
                        value={item.value}
                        onChange={(event) => item.apply(Number(event.target.value))}
                        aria-label={`${item.label} threshold`}
                        className="h-1 w-full flex-1 cursor-pointer appearance-none rounded-full bg-surface-active accent-[var(--color-accent)]"
                      />
                      <span className="w-9 shrink-0 text-right text-meta text-fg tnum">{item.value}%</span>
                    </div>
                  </SettingsRow>
                ))}
              </SettingsSection>
            </>
          )}

          {section === 'application' && (
            <SettingsSection title="About ARES" description="Infrastructure control console for the ARES monitoring agent.">
              <dl className="divide-y divide-line-subtle">
                {[
                  { label: 'Dashboard version', value: '0.1.0' },
                  { label: 'Agent API', value: 'v0.1.0 · REST + WebSocket' },
                  { label: 'Data source', value: mode === 'api' ? 'Live agent' : 'Sample telemetry' },
                  { label: 'Build target', value: 'Vite · React 19 · TypeScript strict' },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-meta text-fg-muted">{row.label}</dt>
                    <dd className="text-meta text-fg">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </SettingsSection>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
