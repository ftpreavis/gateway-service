#!/bin/sh

echo "⏳ Waiting for Vault to be unsealed..."

while true; do
  resp=$(curl -k --silent https://vault.transcendance.charles-poulain.ovh/v1/sys/health)
  if echo "$resp" | grep -q '"sealed":false'; then
    echo "✅ Vault is unsealed. Proceeding with app start."
    break
  fi
  echo "🔒 Vault is still sealed. Retrying in 5s..."
  sleep 5
done
