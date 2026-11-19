#!/bin/sh
set -e

# Reload nginx hourly so renewed Let's Encrypt certs are picked up promptly
(while true; do
  sleep 3600
  nginx -s reload 2>/dev/null || true
done) &

exec nginx -g "daemon off;"
