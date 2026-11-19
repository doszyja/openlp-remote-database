#!/bin/bash
# Daily cron fallback: uses the running certbot container (correct DNS + docker socket).
set -euo pipefail

docker exec openlp-certbot certbot renew \
  --webroot -w /var/www/certbot \
  --deploy-hook "docker exec openlp-web-prod nginx -s reload" \
  --quiet

echo "SSL renewal check finished at $(date -Is)"
