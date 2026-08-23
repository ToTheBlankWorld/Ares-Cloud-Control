import { Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { LandingNav } from '@/components/landing/LandingNav'
import { HeroConsole } from '@/components/landing/HeroConsole'
import { ArchitectureDiagram } from '@/components/landing/ArchitectureDiagram'
import { Reveal, SectionHeading } from '@/components/landing/Reveal'
import { AresLogo } from '@/components/brand/AresLogo'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

// Recharts only enters the bundle once the preview scrolls into reach.
const MetricsPreview = lazy(() =>
  import('@/components/landing/MetricsPreview').then((m) => ({ default: m.MetricsPreview })),
)

const CAPABILITIES = [
  {
    title: 'Processor',
    detail: 'Total utilisation, per-core bars, live frequencies and 1/5/15-minute load averages.',
  },
  {
    title: 'Memory',
    detail: 'Used, cached, free and available broken out, with swap pressure tracked alongside.',
  },
  {
    title: 'Storage',
    detail: 'Every mount with usage bars, plus read and write throughput and IOPS per device.',
  },
  {
    title: 'Network',
    detail: 'Physical links, loopback and docker bridges — throughput and lifetime counters for each.',
  },
  {
    title: 'Processes',
    detail: 'Search, sort and page through the full process table by CPU, memory, state or user.',
  },
  {
    title: 'Thermals and GPU',
    detail: 'Sensor readings against their critical points, NVIDIA utilisation, VRAM and power draw.',
  },
]

const INFRASTRUCTURE_POINTS = [
  {
    title: 'One console for every machine',
    detail:
      'Bare metal, cloud instances and edge nodes register the same way. Status, capacity and load stay side by side.',
  },
  {
    title: 'Second-level resolution',
    detail:
      'The agent samples once per second. Charts render 5-minute through 24-hour windows without leaving the page.',
  },
  {
    title: 'Thresholds you set',
    detail:
      'Warning and critical lines are yours. Breaches surface as timeline events, not as a wall of notifications.',
  },
]

const SECURITY_POINTS = [
  {
    title: 'Localhost by default',
    detail: 'The agent binds to 127.0.0.1. Nothing is exposed until you publish it through a tunnel you control.',
  },
  {
    title: 'Bearer token authentication',
    detail: 'Every endpoint except /api/health requires a token read from a root-owned file on the host.',
  },
  {
    title: 'No telemetry leaves your network',
    detail: 'The console is a static bundle that talks to your agent directly. There is no ARES backend in between.',
  },
]

const STATS = [
  { value: '1s', label: 'Collection interval' },
  { value: '9', label: 'Metric collectors' },
  { value: '0', label: 'Servers to operate' },
  { value: '100%', label: 'Self-hosted' },
]

/**
 * Landing page.
 *
 * Deliberately plain: no gradient headline, no floating cards, no ambient glow.
 * The product screenshot and the endpoint list carry the argument.
 */
export function LandingPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <LandingNav />

      {/* ---------------- Hero ---------------- */}
      <section className="mx-auto max-w-[76rem] px-4 pt-24 pb-14 md:px-6 md:pt-32 md:pb-20">
        <div className="max-w-2xl">
          <h1 className="text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.03em] text-fg sm:text-[3.25rem]">
            Control your infrastructure from one console.
          </h1>
          <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-fg-muted">
            Real-time monitoring for Linux servers. A single Rust agent per host, second-level metrics, and a
            console that shows you everything without asking you to build a dashboard first.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="group inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-meta font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
            >
              Open the console
              <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/servers/cxr-junior"
              className="inline-flex h-9 items-center rounded-md border border-line px-4 text-meta text-fg-muted transition-colors duration-150 hover:border-line-strong hover:text-fg"
            >
              View a live host
            </Link>
          </div>
        </div>

        <Reveal className="mt-12" delay={0.05}>
          <HeroConsole />
        </Reveal>

        <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-line pt-7 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <p className="text-title font-semibold text-fg tnum">{stat.value}</p>
                <p className="mt-1 text-micro text-fg-subtle">{stat.label}</p>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------------- Infrastructure ---------------- */}
      <section id="infrastructure" className="mx-auto max-w-[76rem] px-4 py-16 md:px-6 md:py-20">
        <SectionHeading
          eyebrow="Infrastructure"
          title="Every machine, one surface."
          description="ARES treats a laptop under a desk and a rack in a datacentre the same way: register the agent, and the machine appears with full telemetry attached."
        />

        <div className="mt-9 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {INFRASTRUCTURE_POINTS.map((point, index) => (
            <Reveal key={point.title} delay={index * 0.05}>
              <Card className="h-full">
                <h3 className="text-heading font-semibold text-fg">{point.title}</h3>
                <p className="mt-2 text-meta leading-relaxed text-fg-muted">{point.detail}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Capabilities ---------------- */}
      <section id="monitoring" className="mx-auto max-w-[76rem] px-4 py-16 md:px-6 md:py-20">
        <SectionHeading
          eyebrow="Capabilities"
          title="Nine collectors, one snapshot."
          description="The agent gathers a complete picture of the host every second and hands it over in a single payload. The console renders all of it."
        />

        <div className="mt-9 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((capability) => (
            <div key={capability.title} className="bg-surface p-4">
              <h3 className="text-meta font-semibold text-fg">{capability.title}</h3>
              <p className="mt-1.5 text-meta leading-relaxed text-fg-muted">{capability.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Live view ---------------- */}
      <section className="mx-auto max-w-[76rem] px-4 py-16 md:px-6 md:py-20">
        <SectionHeading
          eyebrow="Live view"
          title="This is the actual interface."
          description="Not a mockup. The panels below are the same components the console renders, running on sample telemetry."
        />
        <Reveal className="mt-9">
          <Suspense fallback={<Skeleton className="h-[30rem] w-full rounded-lg" />}>
            <MetricsPreview />
          </Suspense>
        </Reveal>
      </section>

      {/* ---------------- Security ---------------- */}
      <section id="security" className="mx-auto max-w-[76rem] px-4 py-16 md:px-6 md:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
          <SectionHeading
            eyebrow="Security"
            title="Your telemetry stays on your network."
            description="ARES is deliberately boring about security: a local agent, a token, a tunnel you own, and a static frontend with nothing behind it."
          />

          <div className="divide-y divide-line border-y border-line">
            {SECURITY_POINTS.map((point) => (
              <div key={point.title} className="py-4">
                <h3 className="text-heading font-semibold text-fg">{point.title}</h3>
                <p className="mt-1.5 text-meta leading-relaxed text-fg-muted">{point.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Architecture ---------------- */}
      <section id="architecture" className="mx-auto max-w-[76rem] px-4 py-16 md:px-6 md:py-20">
        <SectionHeading
          eyebrow="Architecture"
          title="Three moving parts, nothing hidden."
          description="A Rust agent on the host, a tunnel you control, and a static console. No queue, no collector fleet, no vendor account."
        />
        <ArchitectureDiagram className="mt-9" />
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="mx-auto max-w-[76rem] px-4 py-16 md:px-6 md:py-20">
        <div className="rounded-lg border border-line bg-surface px-6 py-12 text-center">
          <h2 className="text-title font-semibold text-fg">Take the control seat.</h2>
          <p className="mx-auto mt-2.5 max-w-md text-meta leading-relaxed text-fg-muted">
            Explore the full console on sample telemetry, then point it at your own agent when you are ready.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-meta font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
            >
              Open the console
            </Link>
            <Link
              to="/settings?section=connection"
              className="inline-flex h-9 items-center rounded-md border border-line px-4 text-meta text-fg-muted transition-colors duration-150 hover:border-line-strong hover:text-fg"
            >
              Connect an agent
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-[76rem] px-4 py-10 md:px-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <AresLogo size={22} />
              <p className="mt-3 max-w-xs text-meta leading-relaxed text-fg-muted">
                Infrastructure control console for the ARES monitoring agent. Self-hosted and token-authenticated.
              </p>
            </div>

            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3">
              {[
                {
                  heading: 'Product',
                  links: [
                    { label: 'Console', to: '/dashboard' },
                    { label: 'Servers', to: '/servers' },
                    { label: 'Alerts', to: '/alerts' },
                  ],
                },
                {
                  heading: 'System',
                  links: [
                    { label: 'Settings', to: '/settings' },
                    { label: 'Connect an agent', to: '/settings?section=connection' },
                    { label: 'Demo host', to: '/servers/cxr-junior' },
                  ],
                },
              ].map((group) => (
                <div key={group.heading}>
                  <p className="label uppercase">{group.heading}</p>
                  <ul className="mt-2.5 space-y-1.5">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          to={link.to}
                          className="text-meta text-fg-muted transition-colors duration-150 hover:text-fg"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div>
                <p className="label uppercase">Source</p>
                <ul className="mt-2.5 space-y-1.5">
                  <li>
                    <a
                      href="https://github.com/ToTheBlankWorld/Ares-Cloud-Control"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-meta text-fg-muted transition-colors duration-150 hover:text-fg"
                    >
                      Repository
                    </a>
                  </li>
                </ul>
              </div>
            </nav>
          </div>

          <div className="mt-8 flex flex-col gap-1.5 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-micro text-fg-subtle">ARES Cloud Control · {new Date().getFullYear()}</p>
            <p className="text-micro text-fg-subtle">Console v0.1.0 · Agent API v0.1.0</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
