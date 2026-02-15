#!/bin/bash
set -e

# ===========================================================
# DocPlatform VPS Deployment Script
# Run this on a fresh Ubuntu 22.04/24.04 Hetzner VPS
#
# Usage:
#   1. SSH into your VPS:  ssh root@YOUR_VPS_IP
#   2. Upload this script: scp deploy.sh root@YOUR_VPS_IP:~/
#   3. Run it:             bash deploy.sh
# ===========================================================

APP_DIR="/opt/docplatform"
REPO_URL="${1:-}"

echo "==========================================="
echo "  DocPlatform VPS Setup"
echo "==========================================="

# --- System updates & essentials ---
echo "[1/5] Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y curl git ufw

# --- Firewall ---
echo "[2/5] Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# --- Docker ---
echo "[3/5] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "Docker already installed, skipping."
fi

# --- Project setup ---
echo "[4/5] Setting up project..."
mkdir -p "$APP_DIR"

if [ -n "$REPO_URL" ]; then
    echo "Cloning from $REPO_URL..."
    git clone "$REPO_URL" "$APP_DIR"
else
    echo ""
    echo "No repo URL provided."
    echo "You can either:"
    echo "  a) Re-run with:  bash deploy.sh https://github.com/you/repo.git"
    echo "  b) Manually copy files to $APP_DIR"
    echo ""
fi

# --- Environment file ---
echo "[5/5] Setting up environment..."
if [ -f "$APP_DIR/.env.production" ] && [ ! -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env.production" "$APP_DIR/.env"
    echo ""
    echo "=========================================="
    echo "  IMPORTANT: Edit your .env file!"
    echo "=========================================="
    echo ""
    echo "  nano $APP_DIR/.env"
    echo ""
    echo "  Replace all CHANGE_ME values with real secrets."
    echo "  Generate JWT secrets with:  openssl rand -base64 64"
    echo "  Set DOMAIN to your actual domain name."
    echo ""
fi

echo ""
echo "==========================================="
echo "  Setup complete!"
echo "==========================================="
echo ""
echo "  Next steps:"
echo ""
echo "  1. Copy your project files to $APP_DIR (if not cloned)"
echo "  2. Edit environment:  nano $APP_DIR/.env"
echo "  3. Point your domain DNS (A record) to this server's IP"
echo "  4. Deploy:"
echo ""
echo "     cd $APP_DIR"
echo "     docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "  5. Check status:"
echo ""
echo "     docker compose -f docker-compose.prod.yml ps"
echo "     docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "  Caddy will automatically get SSL certificates once DNS is pointed."
echo ""
