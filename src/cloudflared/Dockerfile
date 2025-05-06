#---------------------------------SERVER---------------------------------

FROM cloudflare/cloudflared:latest

COPY ./conf/* /etc/cloudflared/

USER root

CMD ["tunnel", "--config", "/etc/cloudflared/config.yml", "run"]
