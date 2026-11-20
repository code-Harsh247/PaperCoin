#!/usr/bin/env bash
# Deploys (or updates) PaperCoin on a VM that already runs the shared Caddy
# proxy in ~/proxy on the Docker network "web" (see deploy/README.md in
# github.com/code-Harsh247/Multi-threaded-Programming for that setup).
#
# Usage:  bash setup.sh <site address>
#   e.g.  bash setup.sh papercoin.129-225-109-238.sslip.io
#
# Layout:
#   ~/apps/papercoin      this repo (compose stack "papercoin" lives in deploy/)
#   ~/apps/papercoin-bt   PaperCoin_Backtesting_Server, built by the same stack
#   ~/proxy/sites/papercoin.caddy
# Safe to run again: pulls both repos, keeps existing secrets and data.
set -euo pipefail

SITE_ADDRESS="${1:?usage: setup.sh <site address, e.g. papercoin.129-225-109-238.sslip.io>}"
APP_DIR="$HOME/apps/papercoin"
BT_DIR="$HOME/apps/papercoin-bt"
PROXY_DIR="$HOME/proxy"
ENV_FILE="$APP_DIR/deploy/.env"

clone_or_pull() {   # repo-url dir
  if [ -d "$2/.git" ]; then git -C "$2" pull --ff-only; else git clone "$1" "$2"; fi
}

echo "== 1. Code"
mkdir -p "$HOME/apps"
clone_or_pull https://github.com/code-Harsh247/PaperCoin.git "$APP_DIR"
clone_or_pull https://github.com/code-Harsh247/PaperCoin_Backtesting_Server.git "$BT_DIR"

echo "== 2. Secrets (generated once, then kept)"
if [ ! -f "$ENV_FILE" ]; then
  ( umask 077
    cat > "$ENV_FILE" <<EOF
SITE_ADDRESS=$SITE_ADDRESS
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
# Google sign-in. Leave empty to use email/password only.
OAUTH_CLIENT_ID=
OAUTH_CLIENT_SECRET=
EOF
  )
  echo "created $ENV_FILE"
else
  sed -i "s|^SITE_ADDRESS=.*|SITE_ADDRESS=$SITE_ADDRESS|" "$ENV_FILE"
fi

echo "== 3. Shared Docker network"
sudo docker network inspect web >/dev/null 2>&1 || sudo docker network create web

echo "== 4. Build and start the stack"
(cd "$APP_DIR/deploy" && sudo docker compose up -d --build)

echo "== 5. Route the site through the shared proxy"
sed "s|^SITE_ADDRESS {|$SITE_ADDRESS {|" "$APP_DIR/deploy/papercoin.caddy" > "$PROXY_DIR/sites/papercoin.caddy"
(cd "$PROXY_DIR" && sudo docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile)

sudo docker compose -f "$APP_DIR/deploy/compose.yaml" ps
echo
echo "Deployed. Open https://$SITE_ADDRESS (the certificate can take a minute on first start)."
