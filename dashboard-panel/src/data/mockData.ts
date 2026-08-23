/**
 * Realistic fixture data for ARES Cloud Control.
 *
 * Everything the UI renders while `VITE_DATA_SOURCE=mock` originates here.
 * Values are deterministic (seeded) so charts do not jitter between renders,
 * and the shapes are identical to the agent's real payloads.
 */

import { seededRandom, clamp, average } from '@/lib/utils'
import type {
  Alert,
  CpuMetrics,
  DiskMetrics,
  DockerMetrics,
  GpuMetrics,
  MemoryMetrics,
  MetricsSnapshot,
  NetworkMetrics,
  Process,
  ProcessState,
  SeriesPoint,
  Server,
  SystemInfo,
  TemperatureMetrics,
  TimeRange,
  TimeRangeOption,
} from '@/types'

const GIB = 1024 ** 3

export const TIME_RANGES: TimeRangeOption[] = [
  { value: '5m', label: '5m', minutes: 5, points: 40 },
  { value: '15m', label: '15m', minutes: 15, points: 50 },
  { value: '1h', label: '1h', minutes: 60, points: 60 },
  { value: '6h', label: '6h', minutes: 360, points: 72 },
  { value: '24h', label: '24h', minutes: 1440, points: 96 },
]

/* ------------------------------------------------------------------
   Server registry
   ------------------------------------------------------------------ */

interface ServerProfile {
  id: string
  name: string
  hostname: string
  agentUrl: string
  os: string
  osFamily: Server['osFamily']
  kernel: string
  architecture: string
  region: string
  tags: string[]
  status: Server['status']
  uptimeSeconds: number
  cores: number
  threads: number
  baseClockMhz: number
  memoryTotal: number
  swapTotal: number
  diskTotal: number
  diskUsed: number
  hasGpu: boolean
  /** Steady-state CPU load the generator oscillates around. */
  cpuBias: number
  memBias: number
  seed: number
}

const PROFILES: ServerProfile[] = [
  {
    id: 'cxr-junior',
    name: 'CXR Junior',
    hostname: 'cxr-junior',
    agentUrl: 'https://cxr-junior.ares.internal',
    os: 'Ubuntu 24.04 LTS',
    osFamily: 'ubuntu',
    kernel: '6.8.0-45-generic',
    architecture: 'x86_64',
    region: 'eu-central / fra1',
    tags: ['primary', 'compute', 'bare-metal'],
    status: 'online',
    uptimeSeconds: 13 * 86400 + 21 * 3600 + 42 * 60,
    cores: 12,
    threads: 24,
    baseClockMhz: 3700,
    memoryTotal: Math.round(33.47 * GIB),
    swapTotal: 8 * GIB,
    diskTotal: 1024 * GIB,
    diskUsed: Math.round(130 * GIB),
    hasGpu: true,
    cpuBias: 11.2,
    memBias: 15.8,
    seed: 20240424,
  },
  {
    id: 'atlas-edge',
    name: 'Atlas Edge',
    hostname: 'atlas-edge-01',
    agentUrl: 'https://atlas-edge.ares.internal',
    os: 'Debian 12 (bookworm)',
    osFamily: 'debian',
    kernel: '6.1.0-25-amd64',
    architecture: 'x86_64',
    region: 'us-east / iad1',
    tags: ['edge', 'ingress'],
    status: 'online',
    uptimeSeconds: 47 * 86400 + 6 * 3600 + 11 * 60,
    cores: 8,
    threads: 16,
    baseClockMhz: 3200,
    memoryTotal: 16 * GIB,
    swapTotal: 4 * GIB,
    diskTotal: 512 * GIB,
    diskUsed: Math.round(287 * GIB),
    hasGpu: false,
    cpuBias: 38.4,
    memBias: 61.2,
    seed: 7781,
  },
  {
    id: 'nyx-relay',
    name: 'Nyx Relay',
    hostname: 'nyx-relay-03',
    agentUrl: 'https://nyx-relay.ares.internal',
    os: 'Alpine Linux 3.20',
    osFamily: 'alpine',
    kernel: '6.6.47-0-lts',
    architecture: 'aarch64',
    region: 'ap-south / sin1',
    tags: ['relay', 'staging'],
    status: 'offline',
    uptimeSeconds: 0,
    cores: 4,
    threads: 4,
    baseClockMhz: 2400,
    memoryTotal: 8 * GIB,
    swapTotal: 2 * GIB,
    diskTotal: 256 * GIB,
    diskUsed: Math.round(31 * GIB),
    hasGpu: false,
    cpuBias: 0,
    memBias: 0,
    seed: 31337,
  },
]

export const serverProfiles = PROFILES

function profileById(id: string): ServerProfile | undefined {
  return PROFILES.find((p) => p.id === id)
}

/* ------------------------------------------------------------------
   Deterministic wave generator
   ------------------------------------------------------------------ */

/**
 * Produces a plausible metric curve: a slow trend, a faster ripple and a
 * small amount of seeded noise. Same inputs always yield the same output.
 */
function wave(seed: number, count: number, base: number, amplitude: number, min = 0, max = 100): number[] {
  const rand = seededRandom(seed)
  const phase = rand() * Math.PI * 2
  const out: number[] = []
  for (let i = 0; i < count; i += 1) {
    const slow = Math.sin(phase + i / (count / 3)) * amplitude
    const fast = Math.sin(phase * 2 + i / 3.4) * amplitude * 0.32
    const noise = (rand() - 0.5) * amplitude * 0.45
    out.push(clamp(base + slow + fast + noise, min, max))
  }
  return out
}

/* ------------------------------------------------------------------
   CPU
   ------------------------------------------------------------------ */

export function buildCpu(profile: ServerProfile): CpuMetrics {
  if (profile.status === 'offline') {
    return {
      total_usage_percent: 0,
      cores: [],
      load_average: { one: 0, five: 0, fifteen: 0 },
      core_count: profile.cores,
      thread_count: profile.threads,
      frequencies_mhz: [],
    }
  }

  const rand = seededRandom(profile.seed + 11)
  const cores = Array.from({ length: profile.threads }, (_, id) => {
    const spread = (rand() - 0.35) * profile.cpuBias * 1.9
    return {
      id,
      usage_percent: clamp(profile.cpuBias + spread, 0.2, 100),
      frequency_mhz: Math.round(profile.baseClockMhz * (0.72 + rand() * 0.34)),
      temperature_celsius: profile.osFamily === 'alpine' ? null : Math.round(38 + rand() * 16),
    }
  })

  const total = average(cores.map((c) => c.usage_percent))
  const loadOne = (total / 100) * profile.cores * 1.52

  return {
    total_usage_percent: Number(total.toFixed(2)),
    cores,
    load_average: {
      one: Number(loadOne.toFixed(2)),
      five: Number((loadOne * 0.945).toFixed(2)),
      fifteen: Number((loadOne * 0.874).toFixed(2)),
    },
    core_count: profile.cores,
    thread_count: profile.threads,
    frequencies_mhz: cores.map((c) => c.frequency_mhz),
  }
}

/* ------------------------------------------------------------------
   Memory
   ------------------------------------------------------------------ */

export function buildMemory(profile: ServerProfile): MemoryMetrics {
  if (profile.status === 'offline') {
    const empty = {
      total_bytes: profile.memoryTotal,
      used_bytes: 0,
      available_bytes: profile.memoryTotal,
      free_bytes: profile.memoryTotal,
      cached_bytes: 0,
    }
    return {
      memory: empty,
      swap: { total_bytes: profile.swapTotal, used_bytes: 0, free_bytes: profile.swapTotal },
    }
  }

  const total = profile.memoryTotal
  const used = Math.round(total * (profile.memBias / 100))
  const cached = Math.round(total * 0.586)
  const free = Math.max(0, total - used - cached)
  const available = total - used
  const swapUsed = profile.memBias > 55 ? Math.round(profile.swapTotal * 0.14) : 0

  return {
    memory: {
      total_bytes: total,
      used_bytes: used,
      available_bytes: available,
      free_bytes: free,
      cached_bytes: cached,
    },
    swap: {
      total_bytes: profile.swapTotal,
      used_bytes: swapUsed,
      free_bytes: profile.swapTotal - swapUsed,
    },
  }
}

/* ------------------------------------------------------------------
   Disk
   ------------------------------------------------------------------ */

export function buildDisk(profile: ServerProfile): DiskMetrics {
  const offline = profile.status === 'offline'
  const bootTotal = 2 * GIB
  const efiTotal = Math.round(0.5 * GIB)
  const rootTotal = profile.diskTotal - bootTotal - efiTotal
  const rootUsed = profile.diskUsed
  const bootUsed = Math.round(bootTotal * 0.31)
  const efiUsed = Math.round(efiTotal * 0.12)

  const fs = (mount: string, filesystem: string, total: number, used: number) => ({
    mount_point: mount,
    filesystem,
    total_bytes: total,
    used_bytes: used,
    available_bytes: total - used,
    usage_percent: Number(((used / total) * 100).toFixed(1)),
  })

  return {
    filesystems: [
      fs('/', 'ext4', rootTotal, rootUsed),
      fs('/boot', 'ext4', bootTotal, bootUsed),
      fs('/boot/efi', 'vfat', efiTotal, efiUsed),
      ...(profile.hasGpu ? [fs('/var/lib/docker', 'overlay2', 256 * GIB, Math.round(88 * GIB))] : []),
    ],
    io: offline
      ? { read_bytes_per_sec: 0, write_bytes_per_sec: 0, read_ops_per_sec: 0, write_ops_per_sec: 0 }
      : {
          read_bytes_per_sec: Math.round(1.4 * 1024 * 1024 * (profile.cpuBias / 12)),
          write_bytes_per_sec: Math.round(0.6 * 1024 * 1024 * (profile.cpuBias / 12)),
          read_ops_per_sec: Math.round(118 * (profile.cpuBias / 12)),
          write_ops_per_sec: Math.round(74 * (profile.cpuBias / 12)),
        },
  }
}

/* ------------------------------------------------------------------
   Network
   ------------------------------------------------------------------ */

export function buildNetwork(profile: ServerProfile): NetworkMetrics {
  const offline = profile.status === 'offline'
  const rand = seededRandom(profile.seed + 53)
  const scale = offline ? 0 : 1
  const primaryName = profile.osFamily === 'alpine' ? 'eth0' : 'eno1'

  const interfaces = [
    {
      name: primaryName,
      ipv4_addresses: [`10.20.${profile.seed % 250}.14`],
      ipv6_addresses: ['fe80::a21c:5eff:fe32:9d41'],
      received_bytes: Math.round(842 * GIB * rand()),
      transmitted_bytes: Math.round(517 * GIB * rand()),
      received_bytes_per_sec: Math.round(12.9 * 1024 * scale * (profile.cpuBias / 11 + 0.4)),
      transmitted_bytes_per_sec: Math.round(8.9 * 1024 * scale * (profile.cpuBias / 11 + 0.4)),
      is_up: !offline,
      is_loopback: false,
    },
    {
      name: 'lo',
      ipv4_addresses: ['127.0.0.1'],
      ipv6_addresses: ['::1'],
      received_bytes: Math.round(4.7 * GIB),
      transmitted_bytes: Math.round(4.7 * GIB),
      received_bytes_per_sec: Math.round(2048 * scale),
      transmitted_bytes_per_sec: Math.round(2048 * scale),
      is_up: true,
      is_loopback: true,
    },
  ]

  if (profile.hasGpu) {
    interfaces.push(
      {
        name: 'docker0',
        ipv4_addresses: ['172.17.0.1'],
        ipv6_addresses: [],
        received_bytes: Math.round(21 * GIB),
        transmitted_bytes: Math.round(34 * GIB),
        received_bytes_per_sec: Math.round(3.2 * 1024 * scale),
        transmitted_bytes_per_sec: Math.round(5.6 * 1024 * scale),
        is_up: !offline,
        is_loopback: false,
      },
      {
        name: 'br-8f2a17c4d0e1',
        ipv4_addresses: ['172.19.0.1'],
        ipv6_addresses: [],
        received_bytes: Math.round(6.1 * GIB),
        transmitted_bytes: Math.round(9.4 * GIB),
        received_bytes_per_sec: Math.round(1.1 * 1024 * scale),
        transmitted_bytes_per_sec: Math.round(1.8 * 1024 * scale),
        is_up: !offline,
        is_loopback: false,
      },
    )
  }

  return { interfaces }
}

/* ------------------------------------------------------------------
   GPU / temperature / docker
   ------------------------------------------------------------------ */

export function buildGpu(profile: ServerProfile): GpuMetrics {
  if (!profile.hasGpu || profile.status === 'offline') return { available: false, devices: null }
  return {
    available: true,
    devices: [
      {
        index: 0,
        name: 'NVIDIA GeForce RTX 4070 Ti',
        utilization_percent: 24,
        memory_total_bytes: 12 * GIB,
        memory_used_bytes: Math.round(3.4 * GIB),
        memory_free_bytes: Math.round(8.6 * GIB),
        temperature_celsius: 47,
        power_usage_watts: 96.4,
        power_limit_watts: 285,
        gpu_clock_mhz: 1920,
        memory_clock_mhz: 10501,
        fan_speed_percent: 38,
      },
    ],
  }
}

export function buildTemperature(profile: ServerProfile): TemperatureMetrics {
  if (profile.status === 'offline') return { sensors: [] }
  const rand = seededRandom(profile.seed + 97)
  const sensors = [
    { label: 'CPU Package', temperature_celsius: Math.round(44 + rand() * 14), critical_celsius: 100 },
    { label: 'Core 0', temperature_celsius: Math.round(41 + rand() * 12), critical_celsius: 100 },
    { label: 'Core 1', temperature_celsius: Math.round(41 + rand() * 12), critical_celsius: 100 },
    { label: 'NVMe Composite', temperature_celsius: Math.round(36 + rand() * 10), critical_celsius: 84 },
    { label: 'Chipset', temperature_celsius: Math.round(38 + rand() * 8), critical_celsius: 105 },
  ]
  if (profile.hasGpu) sensors.push({ label: 'GPU Core', temperature_celsius: 47, critical_celsius: 92 })
  return { sensors }
}

export function buildDocker(profile: ServerProfile): DockerMetrics {
  if (!profile.hasGpu || profile.status === 'offline') return { available: false, containers: null }
  return {
    available: true,
    containers: [
      {
        id: '8f2a17c4d0e1',
        name: 'ares-gateway',
        image: 'caddy:2.8-alpine',
        status: 'Up 13 days',
        state: 'running',
        cpu_percent: 0.8,
        memory_bytes: Math.round(0.09 * GIB),
        memory_limit_bytes: GIB,
        network_rx_bytes: Math.round(18 * GIB),
        network_tx_bytes: Math.round(29 * GIB),
        restart_count: 0,
        created: '2025-08-09T22:14:00Z',
        started_at: '2025-08-09T22:14:12Z',
      },
      {
        id: 'a41d9b70cc32',
        name: 'timescale',
        image: 'timescale/timescaledb:2.16-pg16',
        status: 'Up 13 days',
        state: 'running',
        cpu_percent: 3.4,
        memory_bytes: Math.round(1.62 * GIB),
        memory_limit_bytes: 4 * GIB,
        network_rx_bytes: Math.round(4.2 * GIB),
        network_tx_bytes: Math.round(11.7 * GIB),
        restart_count: 1,
        created: '2025-08-09T22:14:00Z',
        started_at: '2025-08-09T22:14:31Z',
      },
    ],
  }
}

/* ------------------------------------------------------------------
   Processes
   ------------------------------------------------------------------ */

interface ProcessSeed {
  name: string
  command: string
  user: string
  weight: number
  memMb: number
  threads: number
  state?: ProcessState
}

const PROCESS_SEEDS: ProcessSeed[] = [
  { name: 'systemd', command: '/sbin/init splash', user: 'root', weight: 0.2, memMb: 12, threads: 1 },
  { name: 'kthreadd', command: '[kthreadd]', user: 'root', weight: 0, memMb: 0, threads: 1, state: 'idle' },
  { name: 'ares-agent', command: '/usr/local/bin/ares-agent --config /etc/ares/config.toml', user: 'ares', weight: 1.1, memMb: 34, threads: 8 },
  { name: 'postgres', command: 'postgres: 16/main: checkpointer', user: 'postgres', weight: 2.6, memMb: 412, threads: 4 },
  { name: 'postgres', command: 'postgres: 16/main: walwriter', user: 'postgres', weight: 0.9, memMb: 188, threads: 2 },
  { name: 'nginx', command: 'nginx: master process /usr/sbin/nginx', user: 'root', weight: 0.4, memMb: 22, threads: 2 },
  { name: 'nginx', command: 'nginx: worker process', user: 'www-data', weight: 3.8, memMb: 96, threads: 6 },
  { name: 'node', command: 'node /srv/ares/api/server.js', user: 'deploy', weight: 7.4, memMb: 684, threads: 12 },
  { name: 'dockerd', command: '/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock', user: 'root', weight: 1.7, memMb: 148, threads: 22 },
  { name: 'containerd', command: '/usr/bin/containerd', user: 'root', weight: 1.2, memMb: 92, threads: 18 },
  { name: 'redis-server', command: 'redis-server 127.0.0.1:6379', user: 'redis', weight: 2.1, memMb: 256, threads: 5 },
  { name: 'sshd', command: 'sshd: /usr/sbin/sshd -D [listener]', user: 'root', weight: 0.1, memMb: 9, threads: 1 },
  { name: 'python3', command: 'python3 /opt/ares/ingest/pipeline.py --workers 4', user: 'ares', weight: 12.6, memMb: 1180, threads: 9 },
  { name: 'rustc', command: 'rustc --edition 2021 --crate-name ares_agent', user: 'ci', weight: 34.2, memMb: 2240, threads: 16, state: 'running' },
  { name: 'systemd-journald', command: '/lib/systemd/systemd-journald', user: 'root', weight: 0.3, memMb: 41, threads: 1 },
  { name: 'cloudflared', command: 'cloudflared tunnel --no-autoupdate run', user: 'cloudflared', weight: 0.9, memMb: 58, threads: 7 },
  { name: 'prometheus', command: '/usr/local/bin/prometheus --config.file=/etc/prometheus/prometheus.yml', user: 'prometheus', weight: 4.3, memMb: 512, threads: 11 },
  { name: 'chronyd', command: '/usr/sbin/chronyd -F 1', user: '_chrony', weight: 0.1, memMb: 4, threads: 1 },
  { name: 'ollama', command: 'ollama serve', user: 'ollama', weight: 8.9, memMb: 1640, threads: 14 },
  { name: 'fail2ban-server', command: '/usr/bin/python3 /usr/bin/fail2ban-server -xf start', user: 'root', weight: 0.5, memMb: 28, threads: 3 },
  { name: 'worker-batch', command: '[worker-batch] <defunct>', user: 'deploy', weight: 0, memMb: 0, threads: 0, state: 'zombie' },
  { name: 'vector', command: '/usr/bin/vector --config /etc/vector/vector.yaml', user: 'vector', weight: 2.8, memMb: 210, threads: 8 },
  { name: 'gunicorn', command: 'gunicorn ares.wsgi:application --workers 4', user: 'deploy', weight: 5.6, memMb: 396, threads: 4 },
  { name: 'bash', command: '-bash', user: 'ops', weight: 0, memMb: 6, threads: 1, state: 'sleeping' },
  { name: 'htop', command: 'htop', user: 'ops', weight: 0.6, memMb: 8, threads: 1, state: 'running' },
  { name: 'rsyslogd', command: '/usr/sbin/rsyslogd -n -iNONE', user: 'syslog', weight: 0.2, memMb: 14, threads: 4 },
  { name: 'snapd', command: '/usr/lib/snapd/snapd', user: 'root', weight: 0.7, memMb: 62, threads: 12 },
  { name: 'cron', command: '/usr/sbin/cron -f -P', user: 'root', weight: 0, memMb: 3, threads: 1, state: 'sleeping' },
  { name: 'unattended-upgr', command: '/usr/bin/python3 /usr/share/unattended-upgrades/unattended-upgrade', user: 'root', weight: 0.1, memMb: 18, threads: 1, state: 'stopped' },
  { name: 'qemu-system-x86', command: 'qemu-system-x86_64 -machine q35 -m 4096 -smp 4', user: 'libvirt-qemu', weight: 6.2, memMb: 4210, threads: 6 },
]

export function buildProcesses(profile: ServerProfile): Process[] {
  if (profile.status === 'offline') return []
  const rand = seededRandom(profile.seed + 401)
  const now = Math.floor(Date.now() / 1000)
  const load = profile.cpuBias / 11.2

  return PROCESS_SEEDS.map((seed, index): Process => {
    const runTime = Math.round(rand() * profile.uptimeSeconds)
    return {
      pid: 300 + index * 137 + Math.floor(rand() * 90),
      name: seed.name,
      command: seed.command,
      user: seed.user,
      cpu_percent: Number((seed.weight * load * (0.7 + rand() * 0.6)).toFixed(1)),
      memory_bytes: Math.round(seed.memMb * 1024 * 1024 * (0.85 + rand() * 0.3)),
      thread_count: seed.threads,
      state: seed.state ?? (rand() > 0.72 ? 'running' : 'sleeping'),
      start_time: now - runTime,
      run_time: runTime,
    }
  }).sort((a, b) => b.cpu_percent - a.cpu_percent)
}

/* ------------------------------------------------------------------
   Snapshot + server summary
   ------------------------------------------------------------------ */

export function buildSystemInfo(profile: ServerProfile): SystemInfo {
  const now = new Date()
  return {
    hostname: profile.hostname,
    os_name: profile.os.split(' ')[0],
    os_version: profile.os,
    kernel_version: profile.kernel,
    architecture: profile.architecture,
    uptime_seconds: profile.uptimeSeconds,
    boot_time: new Date(now.getTime() - profile.uptimeSeconds * 1000).toISOString(),
    agent_version: '0.1.0',
    server_timestamp: now.toISOString(),
  }
}

export function buildSnapshot(serverId: string): MetricsSnapshot {
  const profile = profileById(serverId) ?? PROFILES[0]
  return {
    timestamp: new Date().toISOString(),
    system: buildSystemInfo(profile),
    cpu: buildCpu(profile),
    memory: buildMemory(profile),
    disk: buildDisk(profile),
    network: buildNetwork(profile),
    gpu: buildGpu(profile),
    temperature: buildTemperature(profile),
    processes: buildProcesses(profile),
    docker: buildDocker(profile),
  }
}

export function buildServer(profile: ServerProfile): Server {
  const cpu = buildCpu(profile)
  const memory = buildMemory(profile)
  const disk = buildDisk(profile)
  const network = buildNetwork(profile)
  const root = disk.filesystems[0]
  const primary = network.interfaces[0]

  return {
    id: profile.id,
    name: profile.name,
    hostname: profile.hostname,
    agentUrl: profile.agentUrl,
    os: profile.os,
    osFamily: profile.osFamily,
    region: profile.region,
    tags: profile.tags,
    status: profile.status,
    agentVersion: '0.1.0',
    uptimeSeconds: profile.uptimeSeconds,
    cpu: {
      usagePercent: cpu.total_usage_percent,
      cores: profile.cores,
      loadOne: cpu.load_average.one,
    },
    memory: {
      usagePercent: Number(((memory.memory.used_bytes / memory.memory.total_bytes) * 100).toFixed(1)),
      totalBytes: memory.memory.total_bytes,
      usedBytes: memory.memory.used_bytes,
    },
    disk: {
      usagePercent: root.usage_percent,
      totalBytes: root.total_bytes,
      usedBytes: root.used_bytes,
    },
    network: {
      rxBytesPerSec: primary.received_bytes_per_sec,
      txBytesPerSec: primary.transmitted_bytes_per_sec,
    },
    hasGpu: profile.hasGpu,
    sparkline:
      profile.status === 'offline'
        ? new Array(24).fill(0)
        : wave(profile.seed + 3, 24, profile.cpuBias, profile.cpuBias * 0.55, 0.5, 100).map((v) =>
            Number(v.toFixed(2)),
          ),
  }
}

export const mockServers: Server[] = PROFILES.map(buildServer)

/* ------------------------------------------------------------------
   Time series for charts
   ------------------------------------------------------------------ */

export function buildSeries(serverId: string, range: TimeRange): SeriesPoint[] {
  const profile = profileById(serverId) ?? PROFILES[0]
  const option = TIME_RANGES.find((r) => r.value === range) ?? TIME_RANGES[2]
  const { points, minutes } = option
  const stepMs = (minutes * 60 * 1000) / points
  const now = Date.now()
  const offline = profile.status === 'offline'
  const seed = profile.seed + minutes
  const zeros = () => new Array<number>(points).fill(0)

  const cpu = offline ? zeros() : wave(seed, points, profile.cpuBias, profile.cpuBias * 0.5, 0.4, 100)
  const memory = offline ? zeros() : wave(seed + 1, points, profile.memBias, 3.4, 0.5, 100)
  const swap = offline ? zeros() : wave(seed + 2, points, profile.memBias > 55 ? 14 : 0.4, 1.2, 0, 100)
  const rx = offline ? zeros() : wave(seed + 3, points, 13 * 1024, 7 * 1024, 0, 5e7)
  const tx = offline ? zeros() : wave(seed + 4, points, 9 * 1024, 5 * 1024, 0, 5e7)
  const diskRead = offline ? zeros() : wave(seed + 5, points, 1.4 * 1024 * 1024, 0.9 * 1024 * 1024, 0, 5e8)
  const diskWrite = offline ? zeros() : wave(seed + 6, points, 0.6 * 1024 * 1024, 0.5 * 1024 * 1024, 0, 5e8)
  const load1 = offline
    ? zeros()
    : wave(seed + 7, points, (profile.cpuBias / 100) * profile.cores * 1.5, 0.45, 0, 64)

  return Array.from({ length: points }, (_, i) => ({
    t: now - (points - 1 - i) * stepMs,
    cpu: Number(cpu[i].toFixed(2)),
    memory: Number(memory[i].toFixed(2)),
    swap: Number(swap[i].toFixed(2)),
    rx: Math.round(rx[i]),
    tx: Math.round(tx[i]),
    diskRead: Math.round(diskRead[i]),
    diskWrite: Math.round(diskWrite[i]),
    load1: Number(load1[i].toFixed(2)),
    load5: Number((load1[i] * 0.945).toFixed(2)),
    load15: Number((load1[i] * 0.874).toFixed(2)),
  }))
}

/* ------------------------------------------------------------------
   Alerts
   ------------------------------------------------------------------ */

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

export const mockAlerts: Alert[] = [
  {
    id: 'alr-1041',
    serverId: 'nyx-relay',
    serverName: 'Nyx Relay',
    severity: 'critical',
    status: 'active',
    title: 'Server disconnected',
    description: 'The ARES agent stopped reporting. Last heartbeat received 42 minutes ago.',
    metric: 'agent.heartbeat',
    value: 'no response',
    threshold: '> 60s',
    timestamp: minutesAgo(42),
    resolvedAt: null,
  },
  {
    id: 'alr-1038',
    serverId: 'atlas-edge',
    serverName: 'Atlas Edge',
    severity: 'warning',
    status: 'active',
    title: 'Memory usage exceeded 80%',
    description: 'Resident memory has stayed above the warning threshold for 11 consecutive minutes.',
    metric: 'memory.used_percent',
    value: '81.4%',
    threshold: '> 80%',
    timestamp: minutesAgo(11),
    resolvedAt: null,
  },
  {
    id: 'alr-1036',
    serverId: 'atlas-edge',
    serverName: 'Atlas Edge',
    severity: 'warning',
    status: 'acknowledged',
    title: 'Disk usage exceeded 55%',
    description: 'Root filesystem growth rate suggests capacity exhaustion in roughly 19 days.',
    metric: 'disk./.used_percent',
    value: '56.1%',
    threshold: '> 55%',
    timestamp: minutesAgo(96),
    resolvedAt: null,
  },
  {
    id: 'alr-1031',
    serverId: 'cxr-junior',
    serverName: 'CXR Junior',
    severity: 'info',
    status: 'active',
    title: 'Agent updated to 0.1.0',
    description: 'The monitoring agent restarted cleanly after an in-place upgrade. All collectors are healthy.',
    metric: 'agent.version',
    value: '0.1.0',
    threshold: '—',
    timestamp: minutesAgo(180),
    resolvedAt: null,
  },
  {
    id: 'alr-1024',
    serverId: 'cxr-junior',
    serverName: 'CXR Junior',
    severity: 'critical',
    status: 'resolved',
    title: 'CPU usage exceeded 90%',
    description: 'A compilation job saturated all 12 cores for 6 minutes. Load returned to baseline on its own.',
    metric: 'cpu.total_usage_percent',
    value: '96.8%',
    threshold: '> 90%',
    timestamp: minutesAgo(420),
    resolvedAt: minutesAgo(414),
  },
  {
    id: 'alr-1019',
    serverId: 'atlas-edge',
    serverName: 'Atlas Edge',
    severity: 'warning',
    status: 'resolved',
    title: 'Network egress spike',
    description: 'Outbound throughput on eno1 peaked at 118 MB/s during a scheduled backup window.',
    metric: 'network.eno1.tx',
    value: '118 MB/s',
    threshold: '> 90 MB/s',
    timestamp: minutesAgo(690),
    resolvedAt: minutesAgo(668),
  },
  {
    id: 'alr-1012',
    serverId: 'cxr-junior',
    serverName: 'CXR Junior',
    severity: 'info',
    status: 'resolved',
    title: 'New filesystem detected',
    description: '/var/lib/docker (overlay2) was registered by the disk collector and is now monitored.',
    metric: 'disk.filesystems',
    value: '4 mounts',
    threshold: '—',
    timestamp: minutesAgo(1440),
    resolvedAt: minutesAgo(1439),
  },
  {
    id: 'alr-1007',
    serverId: 'nyx-relay',
    serverName: 'Nyx Relay',
    severity: 'critical',
    status: 'resolved',
    title: 'Disk usage exceeded 90%',
    description: 'Log rotation was misconfigured; /var/log filled the root volume. Retention policy corrected.',
    metric: 'disk./.used_percent',
    value: '93.2%',
    threshold: '> 90%',
    timestamp: minutesAgo(2880),
    resolvedAt: minutesAgo(2790),
  },
]
