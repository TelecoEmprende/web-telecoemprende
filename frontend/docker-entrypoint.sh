#!/bin/sh
set -e

# If SSL certs exist, use the full HTTPS config. Otherwise, use HTTP-only for ACME.
if [ -f /etc/letsencrypt/live/telecobuilders2026.com/fullchain.pem ]; then
    echo "SSL certificates found, enabling HTTPS."
    cp /etc/nginx/available/nginx-ssl.conf /etc/nginx/conf.d/default.conf
else
    echo "No SSL certificates yet, serving HTTP only (for ACME challenge)."
    cp /etc/nginx/available/nginx-http.conf /etc/nginx/conf.d/default.conf
fi

exec nginx -g "daemon off;"
