#!/bin/bash
set -e

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

DOMAIN="telecobuilders2026.com"
EMAIL="${CERTBOT_EMAIL:-admin@$DOMAIN}"

echo "==> Levantando frontend para el challenge ACME..."
docker compose up -d frontend

echo "==> Esperando a que Nginx esté listo..."
sleep 5

echo "==> Solicitando certificado para $DOMAIN y www.$DOMAIN..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

echo "==> Recargando Nginx con los certificados..."
docker compose exec frontend nginx -s reload

echo "==> Certificado instalado correctamente."
echo "    Accede a https://$DOMAIN"
