#!/usr/bin/env bash
# ARES Cloud Control - Start server script
# Starts the monitoring agent and Cloudflare Quick Tunnel.
# Safe to run multiple times.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $*"; }

# Require root privileges
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_fail "This script must be run as root."
        echo "Please run:"
        echo "  sudo ./deploy/start-server.sh"
        exit 1
    fi
}

# Stop existing cloudflared quick tunnel for this project
stop_old_tunnel() {
    log_info "Checking for existing Cloudflare Quick Tunnel..."

    # Find PIDs of cloudflared processes running our specific tunnel
    local pids
    pids=$(pgrep -af "cloudflared tunnel --url http://127.0.0.1:9000" | awk '{print $1}' || true)

    if [[ -n "$pids" ]]; then
        log_warn "Found existing Quick Tunnel process(es): $pids"
        for pid in $pids; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid"
                sleep 1
                if kill -0 "$pid" 2>/dev/null; then
                    kill -9 "$pid"
                fi
                log_pass "Stopped cloudflared (PID: $pid)"
            fi
        done
    else
        log_pass "No existing Quick Tunnel found"
    fi
}

# Start agent service
start_agent() {
    log_info "Starting remotebtop-agent service..."
    systemctl restart remotebtop-agent

    # Wait a moment for startup
    sleep 2

    if systemctl is-active --quiet remotebtop-agent; then
        log_pass "RemoteBtop agent is running"
    else
        log_fail "Agent failed to start."
        systemctl status remotebtop-agent --no-pager -l
        journalctl -u remotebtop-agent -n 50 --no-pager
        exit 1
    fi
}

# Verify local API
verify_local_api() {
    log_info "Verifying local API..."
    local response
    response=$(curl -fsS http://127.0.0.1:9000/api/health) || {
        log_fail "Local API health check failed."
        echo "Checking port 9000:"
        ss -lntp | grep ':9000' || true
        echo "Recent logs:"
        journalctl -u remotebtop-agent -n 50 --no-pager
        exit 1
    }

    echo "Response: $response"
    log_pass "Local API is responding"
}

# Start Cloudflare Quick Tunnel and capture URL
start_cloudflare_tunnel() {
    log_info "Starting Cloudflare Quick Tunnel..."

    local log_file="/var/log/remotebtop-cloudflared.log"
    local pid_file="/run/remotebtop-cloudflared.pid"

    # Ensure log directory exists
    mkdir -p "$(dirname "$log_file")"
    touch "$log_file"
    chmod 644 "$log_file"

    # Start cloudflared in background
    cloudflared tunnel --url http://127.0.0.1:9000 > "$log_file" 2>&1 &
    local cf_pid=$!
    echo "$cf_pid" > "$pid_file"

    # Wait for tunnel URL to appear in logs (up to 30 seconds)
    local url=""
    local timeout=30
    local start_time
    start_time=$(date +%s)

    log_info "Waiting for Cloudflare tunnel URL (timeout: ${timeout}s)..."

    while [[ -z "$url" ]]; do
        if [[ $(($(date +%s) - start_time)) -gt $timeout ]]; then
            log_fail "Timeout waiting for Cloudflare tunnel URL."
            cat "$log_file"
            exit 1
        fi

        # Extract URL from log file
        url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$log_file" | head -1 || true)

        if [[ -z "$url" ]]; then
            sleep 1
        fi
    done

    PUBLIC_URL="$url"
    log_pass "Cloudflare tunnel URL detected: $PUBLIC_URL"
}

# Verify public URL with DNS readiness loop
verify_public_url() {
    log_info "Verifying public URL (with DNS readiness check)..."

    local timeout=60
    local start_time
    start_time=$(date +%s)
    local dns_ok=false
    local http_ok=false
    local hostname

    # Extract hostname from PUBLIC_URL for DNS checks
    hostname=$(echo "$PUBLIC_URL" | sed -E 's|https?://([^/]+).*|\1|')

    log_info "Waiting for DNS propagation of $hostname (timeout: ${timeout}s)..."

    while [[ $(($(date +%s) - start_time)) -le $timeout ]]; do
        # Step 1: Check DNS resolution
        if ! $dns_ok; then
            if getent hosts "$hostname" >/dev/null 2>&1 || nslookup "$hostname" >/dev/null 2>&1; then
                log_pass "DNS resolved for $hostname"
                dns_ok=true
            else
                echo -ne "\r[INFO] Waiting for DNS... $((timeout - $(date +%s) + start_time))s remaining"
                sleep 2
                continue
            fi
        fi

        # Step 2: Once DNS resolves, test HTTP health endpoint
        if $dns_ok && ! $http_ok; then
            local response
            # Use --max-time to prevent hanging, --connect-timeout for DNS/TCP connect
            response=$(curl -fsS --max-time 10 --connect-timeout 5 "$PUBLIC_URL/api/health" 2>/dev/null) || {
                echo -ne "\r[INFO] DNS OK, waiting for HTTP... $((timeout - $(date +%s) + start_time))s remaining"
                sleep 2
                continue
            }
            echo ""
            echo "Response: $response"
            log_pass "Cloudflare Tunnel is reachable"
            return 0
        fi
    done

    # Timeout reached
    echo ""
    log_fail "Timeout waiting for public URL readiness."
    echo "Generated URL: $PUBLIC_URL"
    echo "Hostname: $hostname"
    echo "DNS resolved: $dns_ok"
    echo "HTTP health: $http_ok"
    echo "Cloudflared log (last 50 lines):"
    tail -50 "/var/log/remotebtop-cloudflared.log" 2>/dev/null || cat "/var/log/remotebtop-cloudflared.log" 2>/dev/null || true
    exit 1
}

# Test authenticated metrics
test_authenticated_metrics() {
    log_info "Testing authenticated metrics endpoint..."

    local token
    token=$(cat /etc/remotebtop/token)

    local response
    response=$(curl -fsS -H "Authorization: Bearer $token" "$PUBLIC_URL/api/metrics") || {
        log_fail "Authenticated metrics request failed."
        cat "/var/log/remotebtop-cloudflared.log"
        exit 1
    }

    # Try to extract safe fields with jq if available
    if command -v jq &>/dev/null; then
        local cpu_usage
        local mem_used
        local mem_total
        local core_count

        cpu_usage=$(echo "$response" | jq -r '.cpu.total_usage_percent // "N/A"')
        mem_used=$(echo "$response" | jq -r '.memory.memory.used_bytes // 0')
        mem_total=$(echo "$response" | jq -r '.memory.memory.total_bytes // 0')
        core_count=$(echo "$response" | jq -r '.cpu.core_count // "N/A"')

        # Convert bytes to GB for readability
        local mem_used_gb
        local mem_total_gb
        if [[ "$mem_used" != "0" && "$mem_total" != "0" ]]; then
            mem_used_gb=$(awk "BEGIN {printf \"%.1f\", $mem_used / 1073741824}")
            mem_total_gb=$(awk "BEGIN {printf \"%.1f\", $mem_total / 1073741824}")
            echo "CPU: ${cpu_usage}%"
            echo "Memory: ${mem_used_gb} GB / ${mem_total_gb} GB"
            echo "Cores: ${core_count}"
        else
            echo "CPU: ${cpu_usage}%"
            echo "Cores: ${core_count}"
        fi
    else
        echo "Authenticated endpoint returned successfully (jq not available for detailed parsing)"
    fi

    log_pass "Authenticated metrics endpoint working"
}

# Print final output
print_final() {
    echo ""
    echo "============================================================"
    echo "        ARES CLOUD CONTROL IS ONLINE"
    echo "============================================================"
    echo ""
    echo "Agent:"
    echo "    ● RUNNING"
    echo ""
    echo "Local endpoint:"
    echo "    http://127.0.0.1:9000"
    echo ""
    echo "Cloudflare:"
    echo "    ● CONNECTED"
    echo ""
    echo "Public Agent URL:"
    echo "    $PUBLIC_URL"
    echo ""
    echo "Health:"
    echo "    ● PASS"
    echo ""
    echo "Authenticated metrics:"
    echo "    ● PASS"
    echo ""
    echo "------------------------------------------------------------"
    echo ""
    echo "Dashboard configuration:"
    echo ""
    echo "Agent URL:"
    echo "$PUBLIC_URL"
    echo ""
    echo "API Token:"
    echo "<DO NOT PRINT TOKEN>"
    echo ""
    echo "Retrieve token with:"
    echo ""
    echo "  sudo cat /etc/remotebtop/token"
    echo ""
    echo "------------------------------------------------------------"
    echo ""
    echo "IMPORTANT:"
    echo ""
    echo "This is a Cloudflare Quick Tunnel."
    echo ""
    echo "The URL is temporary and may change when the tunnel"
    echo "is restarted."
    echo ""
    echo "Keep the cloudflared process running."
    echo ""
    echo "============================================================"
}

# Main execution
main() {
    echo "============================================================"
    echo "ARES CLOUD CONTROL - START SERVER"
    echo "============================================================"
    echo ""

    check_root
    start_agent
    verify_local_api
    stop_old_tunnel
    start_cloudflare_tunnel
    verify_public_url
    test_authenticated_metrics
    print_final
}

main "$@"