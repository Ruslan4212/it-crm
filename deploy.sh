#!/usr/bin/env bash
set -euo pipefail

# =====================================================
# Deploy script for IT-CRM
# Usage: ./deploy.sh
#
# Pulls latest Docker images, restarts services.
# Assumes docker compose with production image tags.
# =====================================================

COMPOSE_FILE="${1:-docker-compose.yml}"

echo "==> Pulling latest images..."
docker compose -f "$COMPOSE_FILE" pull

echo "==> Recreating services..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Done! Services:"
docker compose -f "$COMPOSE_FILE" ps
