# ARES Cloud Control — Dashboard

The frontend control center for the ARES monitoring agent. It is a **standalone
static application**: it has no server of its own, does not build the Rust
workspace, and deploys independently to Vercel.

```
Ares-Cloud-Control/
├── agent/            # Rust monitoring agent (untouched by this app)
├── config/
├── deploy/
├── docs/API.md       # the contract this dashboard's types mirror
└── dashboard-panel/  # ← you are here
```

## Stack

React 19 · TypeScript (strict) · Vite 7 · Tailwind CSS 4 · Motion · Recharts ·
React Router 7 · Lucide.

## Running locally

```bash
cd dashboard-panel
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle into dist/
npm run preview    # serve the built bundle
npm run lint
```

No backend is required. The app boots against realistic mock telemetry.

## Data sources

Every component reads through `dataSource()` in `src/services/index.ts`, which
returns one of two implementations of the same `AresDataSource` contract:

| Module | Purpose |
| --- | --- |
| `src/services/mockService.ts` | Default. Deterministic fixtures with simulated latency. |
| `src/services/apiService.ts` | Live agent. Maps 1:1 onto the endpoints in `docs/API.md`. |

The metric types in `src/types/index.ts` mirror the agent's JSON payloads
field-for-field (snake_case included), so switching sources requires no UI
changes.

### Pointing the dashboard at a real agent

The agent is reached over a Cloudflare tunnel whose hostname rotates on every
restart, so **the URL is never hardcoded**. It resolves in this order:

1. A runtime override saved in **Settings → Servers** (kept in `localStorage`).
2. Build-time environment variables.
3. Nothing — the dashboard stays on mock data.

```bash
cp .env.example .env.local
```

```dotenv
VITE_DATA_SOURCE=api
VITE_AGENT_URL=https://xxxxx.trycloudflare.com
VITE_AGENT_TOKEN=your-agent-token
```

The agent must send permissive CORS headers (or be proxied) for the browser to
reach it cross-origin.

## Routes

| Path | Page |
| --- | --- |
| `/` | Landing page |
| `/dashboard` | Control center overview |
| `/servers` | Fleet list (grid and table views) |
| `/servers/:id` | Per-host panels: CPU, memory, disk, network, processes, system, thermals, GPU |
| `/monitoring` | Resolves to the primary host's monitoring view |
| `/processes` | Resolves to the primary host's process table |
| `/alerts` | Alert timeline |
| `/settings` | Appearance, notifications, servers, monitoring, security, about |

`Ctrl`/`⌘` + `K` opens the command palette anywhere inside the control center.

## Layout

```
src/
├── components/
│   ├── alerts/      AlertCard, AlertTimeline
│   ├── brand/       AresMark, AresLogo
│   ├── common/      AmbientBackdrop, BootScreen
│   ├── dashboard/   MetricCard, ServerCard, MetricChart, Sparkline, ServerOverview
│   ├── landing/     HeroVisual, MetricsPreview, ArchitectureDiagram, LandingNav
│   ├── layout/      AppLayout, Sidebar, Topbar, CommandPalette, PageContainer
│   ├── server/      Cpu/Memory/Disk/Network/Temperature/Gpu panels, ProcessTable
│   ├── servers/     AddServerModal, ServerTable
│   ├── settings/    SettingsSidebar, SettingsSection
│   └── ui/          Button, Card, Badge, Modal, Dropdown, Tooltip, Tabs, Toast, …
├── context/         Settings provider (theme, accent, thresholds)
├── data/            mockData.ts — every fixture in the app
├── hooks/           useAsync, useAresData, useCountUp, useMediaQuery
├── lib/             formatters and class utilities
├── pages/
├── services/        mockService, apiService, agentConfig
└── types/           domain + agent payload types
```

## Deploying to Vercel

Set the **Root Directory** to `dashboard-panel`. Framework preset: Vite.
`vercel.json` supplies the SPA rewrite so deep links such as
`/servers/cxr-junior` resolve. Add `VITE_AGENT_URL` and `VITE_AGENT_TOKEN` as
project environment variables when you are ready to go live; without them the
deployment serves mock data.

## Accessibility and motion

Focus rings are visible on every interactive element, dialogs trap focus and
restore it on close, tables expose `aria-sort`, and all animation collapses when
`prefers-reduced-motion: reduce` is set.
