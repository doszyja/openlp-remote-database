#!/bin/sh
set -e

# Embedded Docker DNS can fail external lookups on this host (Let's Encrypt API).
printf 'nameserver 127.0.0.11\nnameserver 213.186.33.99\nnameserver 1.1.1.1\noptions ndots:0\n' > /etc/resolv.conf

trap exit TERM
while :; do
  certbot renew \
    --webroot -w /var/www/certbot \
    --deploy-hook "docker exec openlp-web-prod nginx -s reload" \
    --quiet
  sleep 12h & wait $!
done
