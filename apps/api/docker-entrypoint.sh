#!/bin/sh
set -e

# Keep Docker embedded DNS for service names (mongodb, api, web).
# Add upstream resolvers as fallback when embedded DNS fails external lookups (Discord OAuth).
printf 'nameserver 127.0.0.11\nnameserver 213.186.33.99\nnameserver 1.1.1.1\noptions ndots:0\n' > /etc/resolv.conf

exec pnpm exec node apps/api/dist/main.js
