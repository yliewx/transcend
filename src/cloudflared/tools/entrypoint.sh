#!/bin/bash

NGINX_IP=$(getent hosts nginx | awk '{ print $1 }')

if [ -n "$NGINX_IP" ]; then
  echo "Injecting nginx ($NGINX_IP) into /etc/hosts..."
  echo "$NGINX_IP parsleypong.com" >> /etc/hosts
else
  echo "Failed to resolve nginx. Proceeding without modifying /etc/hosts."
fi

exec cloudflared tunnel --config /etc/cloudflared/config.yml run
