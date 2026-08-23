# Deployment Guide

## ⚠️ Security Warnings

**READ BEFORE DEPLOYING**

1. **Docker Socket Access is Highly Privileged**
   - If you enable Docker monitoring (`docker.enabled = true`), the agent needs read access to `/var/run/docker.sock`
   - **DO NOT** add the `remotebtop` user to the `docker` group — this grants **full root-equivalent Docker control**
   - Instead, use one of these safer approaches:
     - **ACL**: `sudo setfacl -m u:remotebtop:r /var/run/docker.sock`
     - **Docker Socket Proxy**: Run `tecnativa/docker-socket-proxy` with read-only access
     - **Podman Rootless**: Use Podman with rootless containers
     - **systemd Socket Activation**: Create a dedicated proxy service

2. **GPU Monitoring Requires NVIDIA Drivers**
   - Requires `nvidia-driver-535+` and NVML library
   - Disabled by default for security

3. **Token File Permissions**
   - Token file must be `chmod 600` and owned by `remotebtop:remotebtop`
   - Never commit tokens to version control

4. **Network Binding**
   - Agent binds to `127.0.0.1:9000` by default (localhost only)
   - Never change to `0.0.0.0` without firewall rules
   - Use Cloudflare Tunnel, Tailscale, or VPN for remote access

---

## Quick Start (Ubuntu Server)

### 1. Build the Release Binary

On your development machine (requires Rust):

```bash
cargo build --release --bin remotebtop-agent
```

The binary will be at `target/release/remotebtop-agent`.

### 2. Copy to Ubuntu Server

```bash
scp target/release/remotebtop-agent user@your-server:/tmp/
```

### 3. Install on Ubuntu Server

```bash
# On the Ubuntu server
sudo useradd -r -s /bin/false remotebtop
sudo mkdir -p /etc/remotebtop
sudo cp /tmp/remotebtop-agent /usr/local/bin/
sudo chown root:root /usr/local/bin/remotebtop-agent
sudo chmod 755 /usr/local/bin/remotebtop-agent
```

### 4. Create Configuration

```bash
sudo cp config.example.toml /etc/remotebtop/config.toml
sudo chown remotebtop:remotebtop /etc/remotebtop/config.toml
sudo chmod 640 /etc/remotebtop/config.toml
```

Edit `/etc/remotebtop/config.toml` as needed.
**By default, GPU and Docker monitoring are disabled.** Enable them only if needed and you understand the security implications.

### 5. Generate Authentication Token

```bash
openssl rand -hex 32 | sudo tee /etc/remotebtop/token > /dev/null
sudo chown remotebtop:remotebtop /etc/remotebtop/token
sudo chmod 600 /etc/remotebtop/token
```

### 6. Install systemd Service

```bash
sudo cp deploy/remotebtop-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable remotebtop-agent
sudo systemctl start remotebtop-agent
```

### 7. Verify

```bash
sudo systemctl status remotebtop-agent
sudo journalctl -u remotebtop-agent -f
```

Test the API:

```bash
TOKEN=$(sudo cat /etc/remotebtop/token)
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:9000/api/health
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:9000/api/metrics
```

### 8. Enable Docker Monitoring (Optional, Advanced)

**Only if you understand the security implications:**

```bash
# Option A: ACL (recommended for simple setups)
sudo setfacl -m u:remotebtop:r /var/run/docker.sock

# Option B: Docker socket proxy (recommended for production)
# docker run -d --name docker-proxy \
#   -v /var/run/docker.sock:/var/run/docker.sock:ro \
#   -p 127.0.0.1:2375:2375 \
#   tecnativa/docker-socket-proxy
# Then set docker.socket = "http://127.0.0.1:2375" in config.toml

# Option C: Podman rootless (most secure)
# Use Podman instead of Docker

# Then enable in config:
# [docker]
# enabled = true
```

Update `/etc/remotebtop/config.toml` and restart:
```bash
sudo systemctl restart remotebtop-agent
```

### 9. Cloudflare Tunnel (Optional)

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Run tunnel (ephemeral URL)
cloudflared tunnel --url http://127.0.0.1:9000

# Or run as service for persistent tunnel
# See: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
```

## File Locations

| File | Location |
|------|----------|
| Binary | `/usr/local/bin/remotebtop-agent` |
| Config | `/etc/remotebtop/config.toml` |
| Token | `/etc/remotebtop/token` |
| Service | `/etc/systemd/system/remotebtop-agent.service` |

## Updating

```bash
# Build new version
cargo build --release --bin remotebtop-agent

# Deploy
scp target/release/remotebtop-agent user@server:/tmp/
ssh user@server "sudo systemctl stop remotebtop-agent && sudo cp /tmp/remotebtop-agent /usr/local/bin/ && sudo systemctl start remotebtop-agent"
```

## Uninstall

```bash
sudo systemctl stop remotebtop-agent
sudo systemctl disable remotebtop-agent
sudo rm /etc/systemd/system/remotebtop-agent.service
sudo rm /usr/local/bin/remotebtop-agent
sudo rm -rf /etc/remotebtop
sudo userdel remotebtop
sudo systemctl daemon-reload
```