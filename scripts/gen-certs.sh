#!/usr/bin/env bash
# Generate self-signed dev certificates
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$DIR/certs"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$DIR/certs/dev.key" -out "$DIR/certs/dev.crt" \
  -subj "/CN=localhost"
echo "Certificates generated:"
echo "  $DIR/certs/dev.key"
echo "  $DIR/certs/dev.crt"
