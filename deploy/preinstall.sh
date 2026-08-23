#!/usr/bin/env bash
# ARES Cloud Control - Pre-installation script
# Prepares a fresh Ubuntu server for the ARES monitoring agent.
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

# Global failure tracking
FAILED_STEP=""

fail() {
    FAILED_STEP="$1"
    log_fail "$2"
    exit 1
}

# Check if running on Linux/Ubuntu
check_os() {
    if [[ "$(uname -s)" != "Linux" ]]; then
        fail "os" "This script must run on Linux."
    fi
    if ! grep -qi ubuntu /etc/os-release 2>/dev/null; then
        log_warn "This script is designed for Ubuntu. Proceeding anyway..."
    fi
    log_pass "Running on Linux ($(grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '\"'))"
}

# Check required commands
check_commands() {
    local required=(
        cargo rustc systemctl curl openssl install awk grep sed pgrep
    )
    local missing=()

    for cmd in "${required[@]}"; do
        if ! command -v "$cmd" &>/dev/null; then
            missing+=("$cmd")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        fail "commands" "Missing required commands: ${missing[*]}"
    fi

    log_pass "All required commands found"

    # Check cloudflared separately
    if ! command -v cloudflared &>/dev/null; then
        log_warn "cloudflared not found."
        echo "  Install it with:"
        echo "    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb"
        echo "    sudo dpkg -i cloudflared.deb"
        echo "  Or see: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
        fail "cloudflared" "cloudflared is required but not installed"
    fi
    log_pass "cloudflared found: $(cloudflared --version | head -1)"
}

# Check Rust toolchain
check_rust() {
    log_info "Checking Rust toolchain..."
    echo "  Rust version: $(rustc --version)"
    echo "  Cargo version: $(cargo --version)"
    log_pass "Rust toolchain verified"
}

# Run a build step with clear PASS/FAIL output
run_step() {
    local step_num="$1"
    local step_name="$2"
    shift 2
    local cmd=("$@")

    echo -e "\n[${step_num}/7] ${step_name}..."
    if "${cmd[@]}"; then
        log_pass "${step_name}"
    else
        fail "build" "${step_name} failed"
    fi
}

# Build the production agent
build_agent() {
    log_info "Building production agent..."

    run_step 1 "Checking formatting" cargo fmt --all -- --check
    run_step 2 "cargo check" cargo check --workspace
    run_step 3 "clippy" cargo clippy --workspace --all-targets --all-features -- -D warnings
    run_step 4 "tests" cargo test --workspace
    run_step 5 "release build" cargo build --release --bin remotebtop-agent
}

# Verify release binary
verify_binary() {
    log_info "Verifying release binary..."
    local binary="target/release/remotebtop-agent"

    if [[ ! -f "$binary" ]]; then
        fail "binary" "Binary not found at $binary"
    fi

    echo "  File type: $(file "$binary")"
    echo "  Size: $(ls -lh "$binary" | awk '{print $5}')"
    log_pass "Release binary verified"
}

# Create system user
create_user() {
    log_info "Creating system user..."
    if id "remotebtop" &>/dev/null; then
        log_pass "User 'remotebtop' already exists"
    else
        useradd --system --no-create-home --shell /usr/sbin/nologin remotebtop
        log_pass "User 'remotebtop' created"
    fi
}

# Install binary
install_binary() {
    log_info "Installing binary..."
    install -m 0755 -o root -g root target/release/remotebtop-agent /usr/local/bin/remotebtop-agent
    log_pass "Binary installed to /usr/local/bin/remotebtop-agent"
}

# Create configuration directory
create_config_dir() {
    log_info "Creating configuration directory..."
    mkdir -p /etc/remotebtop
    log_pass "Configuration directory: /etc/remotebtop"
}

# Install config file
install_config() {
    log_info "Installing configuration..."

    local src="$(dirname "$0")/../config/config.example.toml"
    local dst="/etc/remotebtop/config.toml"

    if [[ ! -f "$src" ]]; then
        fail "config" "Source config not found at $src"
    fi

    if [[ -f "$dst" ]]; then
        log_warn "Config already exists at $dst - preserving existing configuration"
    else
        cp "$src" "$dst"
        log_pass "Configuration installed"
    fi
}

# Ensure authentication token exists
ensure_token() {
    log_info "Checking authentication token..."
    local token_file="/etc/remotebtop/token"

    if [[ -f "$token_file" ]]; then
        log_pass "Token already exists (preserved)"
    else
        openssl rand -hex 32 > "$token_file"
        log_pass "New authentication token generated"
    fi
}

# Set permissions
set_permissions() {
    log_info "Setting permissions..."

    chown remotebtop:remotebtop /etc/remotebtop/config.toml
    chmod 0640 /etc/remotebtop/config.toml

    chown remotebtop:remotebtop /etc/remotebtop/token
    chmod 0600 /etc/remotebtop/token

    log_pass "Permissions set"
}

# Ensure CORS configuration exists in config.toml
ensure_cors_config() {
    log_info "Ensuring CORS configuration..."

    local config_file="/etc/remotebtop/config.toml"

    if ! grep -q "^\[cors\]" "$config_file"; then
        cat >> "$config_file" << 'EOF'

[cors]
# Allowed origins for CORS. Empty = allow all (development only).
# For production, specify the dashboard origin(s) explicitly:
# allowed_origins = ["https://ares-cloud-control.vercel.app"]
# For local development:
allowed_origins = ["http://localhost:5173"]

# HTTP methods allowed for cross-origin requests
allowed_methods = ["GET", "POST", "OPTIONS"]

# Headers allowed for cross-origin requests
allowed_headers = ["Authorization", "Content-Type"]

# Allow credentials (cookies, auth headers) in cross-origin requests
allow_credentials = false

# Max age for preflight cache in seconds (default: 24 hours)
max_age = 86400
EOF
        log_pass "CORS configuration added to config.toml"
    else
        log_pass "CORS configuration already present"
    fi
}

# Install systemd service
install_service() {
    log_info "Installing systemd service..."

    local src="$(dirname "$0")/remotebtop-agent.service"
    local dst="/etc/systemd/system/remotebtop-agent.service"

    if [[ ! -f "$src" ]]; then
        fail "service" "Service file not found at $src"
    fi

    cp "$src" "$dst"
    log_pass "Service file installed"
}

# Verify systemd service
verify_service() {
    log_info "Verifying systemd service..."
    if systemd-analyze verify /etc/systemd/system/remotebtop-agent.service; then
        log_pass "Service file is valid"
    else
        fail "service" "Service file validation failed"
    fi
}

# Reload systemd and enable service
enable_service() {
    log_info "Reloading systemd and enabling service..."
    systemctl daemon-reload
    systemctl enable remotebtop-agent
    log_pass "Service enabled (not started - use start-server.sh)"
}

# Print summary
print_summary() {
    echo ""
    echo "=================================================="
    echo "ARES CLOUD CONTROL PREINSTALL COMPLETE"
    echo "=================================================="
    echo ""
    echo "Rust build: PASS"
    echo "Tests: PASS"
    echo "Clippy: PASS"
    echo "Release binary: PASS"
    echo "Agent user: PASS"
    echo "Configuration: PASS"
    echo "Token: PASS"
    echo "Systemd service: PASS"
    echo ""
    echo "Installed binary: /usr/local/bin/remotebtop-agent"
    echo "Config: /etc/remotebtop/config.toml"
    echo "Token: /etc/remotebtop/token"
    echo ""
    echo "Next step:"
    echo "  sudo ./deploy/start-server.sh"
    echo ""
    echo "=================================================="
}

# Main execution
main() {
    echo "=================================================="
    echo "ARES CLOUD CONTROL - PREINSTALL"
    echo "=================================================="
    echo ""

    check_os
    check_commands
    check_rust
    build_agent
    verify_binary
    create_user
    install_binary
    create_config_dir
    install_config
    ensure_token
    set_permissions
    ensure_cors_config
    install_service
    verify_service
    enable_service

    print_summary
}

main "$@"