# 🚀 RemoteBtop Agent

> **A lightweight, production-quality Linux server monitoring agent written in Rust**  
> Exposes live system metrics via REST API + WebSocket — built for 24/7 operation on your Ubuntu server.

[![Rust](https://img.shields.io/badge/rust-1.75+-orange.svg)](https://www.rust-lang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Platform](https://img.shields.io/badge/platform-Linux-lightgrey.svg)]()

---

## 🎯 Why RemoteBtop?

| Feature | Description |
|---------|-------------|
| 🔥 **Blazing Fast** | Single collection loop → shared in-memory snapshot → zero per-request overhead |
| 🛡 **Production Ready** | Graceful degradation, no crashes on missing hardware, hardened systemd service |
| 🔐 **Secure by Default** | Localhost-only bind, token auth, no shell/terminal access, minimal capabilities |
| 📊 **Complete Metrics** | CPU, RAM, GPU, Disk, Network, Processes, Docker, Temperatures, System info |
| ⚡ **Real-time** | WebSocket pushes full snapshot ~1 Hz — perfect for dashboards |
| 🐳 **Docker Native** | Container stats via Docker Engine API (Unix socket) |
| 🎮 **NVIDIA GPU** | Full NVML support: utilization, VRAM, temp, power, clocks, fan speed |
| 🌐 **Tunnel Agnostic** | Works with Cloudflare, Tailscale, nginx, WireGuard — zero Rust dependencies |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        UBUNTU SERVER                                │
│  ┌──────────────┐    localhost:9000    ┌──────────────────────┐   │
│  │  /proc       │ ◄──────────────────► │  RemoteBtop Agent    │   │
│  │  /sys        │   sysinfo / NVML     │  (Rust + Tokio)      │   │
│  │  Docker API  │ ◄──────────────────► │  • REST API          │   │
│  └──────────────┘                      │  • WebSocket         │   │
│                                        │  • Shared State      │   │
│                                        └──────────┬───────────┘   │
└───────────────────────────────────────────────────│───────────────┘
                                                    │ cloudflared / VPN / Proxy
                                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │   Android   │  │   Web UI    │  │   Grafana   │  ...           │
│  │   App       │  │   (WASM)    │  │   / Prom    │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features at a Glance

### 📈 Metrics Collected

| Category | Details |
|----------|---------|
| **CPU** | Total + per-core usage %, frequency (MHz), temperature (°C), load average (1/5/15), core/thread count |
| **Memory** | Total, used, available, free, cached (bytes) + Swap total/used/free |
| **GPU (NVIDIA)** | Name, utilization %, VRAM total/used/free, temperature, power (W), GPU/memory clocks, fan % |
| **Disk** | Per-filesystem: mount point, type, total/used/available bytes, usage % + aggregate I/O rates |
| **Network** | Per-interface: IPv4/IPv6, RX/TX bytes, RX/TX bytes/sec, up/loopback status |
| **Processes** | PID, name, command, user, CPU %, memory bytes, threads, state, start/run time (sortable) |
| **Docker** | Container ID, name, image, status, state, CPU %, memory/limit, network RX/TX, restart count |
| **System** | Hostname, OS, kernel, architecture, uptime, boot time, agent version, server timestamp |
| **Temperature** | CPU package, per-core, GPU, other sensors |

---

## 🚀 Quick Start

### Prerequisites

- **Build machine**: Rust 1.75+ (`rustup`)
- **Target server**: Ubuntu 20.04+/Debian 11+, systemd
- **Optional**: NVIDIA drivers + NVML for GPU, Docker Engine for containers

### 1. Build Release Binary

```bash
# On your development machine
git clone https://github.com/ToTheBlankWorld/Ares-Cloud-Control.git
cd Ares-Cloud-Control
cargo build --release --bin remotebtop-agent
# 🎉 Binary at: target/release/remotebtop-agent
```

### 2. Deploy to Ubuntu Server

```bash
# Copy binary to server
scp target/release/remotebtop-agent user@your-server:/tmp/

# On the Ubuntu server:
sudo useradd -r -s /bin/false remotebtop
sudo cp /tmp/remotebtop-agent /usr/local/bin/
sudo chown root:root /usr/local/bin/remotebtop-agent
sudo chmod 755 /usr/local/bin/remotebtop-agent

# Configuration
sudo mkdir -p /etc/remotebtop
sudo cp config.example.toml /etc/remotebtop/config.toml
sudo chown remotebtop:remotebtop /etc/remotebtop/config.toml
sudo chmod 640 /etc/remotebtop/config.toml

# Generate secure token
openssl rand -hex 32 | sudo tee /etc/remotebtop/token > /dev/null
sudo chown remotebtop:remotebtop /etc/remotebtop/token
sudo chmod 600 /etc/remotebtop/token

# Optional: Docker access
sudo usermod -aG docker remotebtop
```

### 3. Install & Start systemd Service

```bash
sudo cp deploy/remotebtop-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable remotebtop-agent
sudo systemctl start remotebtop-agent

# Verify
sudo systemctl status remotebtop-agent
sudo journalctl -u remotebtop-agent -f
```

### 4. Test the API

```bash
TOKEN=$(sudo cat /etc/remotebtop/token)

# Health check (no auth)
curl http://127.0.0.1:9000/api/health

# Full metrics (with auth)
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:9000/api/metrics | jq .

# CPU only
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:9000/api/cpu | jq .
```

---

## ⚙️ Configuration

**File**: `/etc/remotebtop/config.toml` (or pass path as CLI arg)

```toml
[server]
host = "127.0.0.1"    # Bind address (never 0.0.0.0 in prod!)
port = 9000           # Port

[monitoring]
interval_ms = 1000    # Collection interval (1 second default)
process_limit = 100   # Max processes to track

[auth]
token_file = "/etc/remotebtop/token"  # Required!

[gpu]
enabled = true        # NVIDIA NVML (Linux only)

[docker]
enabled = true        # Docker Engine API
socket = "/var/run/docker.sock"
```

---

## 🔐 Authentication

All endpoints except `/api/health` require a valid token.

### REST API
```bash
# Bearer token (recommended)
curl -H "Authorization: Bearer YOUR_TOKEN" http://127.0.0.1:9000/api/metrics

# Token prefix (also works)
curl -H "Authorization: Token YOUR_TOKEN" http://127.0.0.1:9000/api/metrics
```

### WebSocket
```javascript
const token = "YOUR_TOKEN";
const ws = new WebSocket("ws://127.0.0.1:9000/ws", {
  headers: { "Authorization": `Bearer ${token}` }
});

ws.onmessage = (event) => {
  const metrics = JSON.parse(event.data);
  console.log("CPU:", metrics.cpu.total_usage_percent + "%");
  console.log("RAM:", (metrics.memory.used_bytes / metrics.memory.total_bytes * 100).toFixed(1) + "%");
};
```

---

## 🌐 Cloudflare Tunnel (Optional)

The agent knows **nothing** about Cloudflare. Run `cloudflared` separately:

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Quick ephemeral tunnel (for testing)
cloudflared tunnel --url http://127.0.0.1:9000

# Production: Named tunnel with custom domain
cloudflared tunnel login
cloudflared tunnel create remotebtop
cloudflared tunnel route dns remotebtop monitoring.yourdomain.com
# Configure ~/.cloudflared/config.yml with ingress rules
# Run as systemd service
```

**Also works with**: Tailscale, WireGuard, nginx, Caddy, Traefik, SSH tunnels — zero code changes.

---

## 📚 API Reference

### REST Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | ❌ | Health check |
| `GET` | `/api/status` | ✅ | Collector status |
| `GET` | `/api/system` | ✅ | System info |
| `GET` | `/api/cpu` | ✅ | CPU metrics |
| `GET` | `/api/memory` | ✅ | Memory + swap |
| `GET` | `/api/gpu` | ✅ | GPU metrics |
| `GET` | `/api/disk` | ✅ | Disk usage + I/O |
| `GET` | `/api/network` | ✅ | Network interfaces |
| `GET` | `/api/processes` | ✅ | Process list (query: `sort_by`, `limit`, `offset`) |
| `GET` | `/api/docker` | ✅ | Container metrics |
| `GET` | `/api/metrics` | ✅ | **Complete snapshot** |

### WebSocket

```
GET /ws
```
Sends `FullMetricsSnapshot` JSON ~once/second. Same auth as REST.

📖 **Full API docs**: [docs/API.md](docs/API.md)

---

## 🛡 Security

- ✅ **Localhost-only bind** (`127.0.0.1:9000` by default)
- ✅ **Token authentication** on all sensitive endpoints
- ✅ **No shell/terminal/command execution** — monitoring only
- ✅ **No process control** — read-only metrics
- ✅ **Hardened systemd**: `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=strict`, minimal caps
- ✅ **Tokens never logged** — not in stdout, journald, or API responses
- ✅ **No database** — no persistent storage of credentials

---

## 📦 Project Structure

```
remote-btop/
├── Cargo.toml                 # Workspace root
├── README.md                  # This file
├── .gitignore                 # Excludes target/, secrets, IDE files
├── LICENSE                    # MIT License
├── config/
│   └── config.example.toml    # Example configuration
├── deploy/
│   ├── remotebtop-agent.service  # Hardened systemd unit
│   └── README.md              # Deployment guide
├── docs/
│   └── API.md                 # Complete API documentation
└── agent/
    ├── Cargo.toml             # Agent crate
    └── src/
        ├── main.rs            # Entry point
        ├── config.rs          # TOML config
        ├── error.rs           # Typed errors (thiserror)
        ├── state.rs           # Shared metrics state (Arc<RwLock>)
        ├── api.rs             # REST + auth middleware
        ├── websocket.rs       # WebSocket handler
        ├── models.rs          # Strongly-typed models
        └── metrics/
            ├── mod.rs         # Orchestrator + loop
            ├── cpu.rs         # CPU collector
            ├── memory.rs      # RAM + swap
            ├── disk.rs        # Filesystems + I/O
            ├── network.rs     # Interfaces + rates
            ├── processes.rs   # Process list
            ├── gpu.rs         # NVIDIA NVML
            ├── docker.rs      # Docker Engine API
            ├── system.rs      # System info
            └── temperature.rs # Thermal sensors
```

---

## 🧪 Development

```bash
# Format check
cargo fmt --all -- --check

# Lint (strict)
cargo clippy --workspace --all-targets --all-features -- -D warnings

# Run tests
cargo test --workspace

# Release build
cargo build --release
```

---

## 📋 Requirements

| Component | Version |
|-----------|---------|
| Rust | 1.75+ |
| Ubuntu/Debian | 20.04+ / 11+ |
| systemd | Required |
| NVIDIA drivers | 535+ (for GPU) |
| Docker Engine | 20.10+ (for containers) |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [sysinfo](https://github.com/GuillaumeGomez/sysinfo) — Cross-platform system info
- [nvml-wrapper](https://github.com/rust-gpu/nvml-wrapper) — NVIDIA Management Library bindings
- [bollard](https://github.com/fussybeaver/bollard) — Docker API client
- [axum](https://github.com/tokio-rs/axum) — Modern web framework
- [tokio](https://tokio.rs/) — Async runtime

---

<div align="center">

**Built with ❤️ in Rust** — For developers who want visibility without complexity.

[⭐ Star this repo](https://github.com/ToTheBlankWorld/Ares-Cloud-Control) • [🐛 Report Bug](https://github.com/ToTheBlankWorld/Ares-Cloud-Control/issues) • [💡 Request Feature](https://github.com/ToTheBlankWorld/Ares-Cloud-Control/issues)

</div>