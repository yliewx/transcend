#---------------------------------SERVER---------------------------------

FROM cloudflare/cloudflared:latest

COPY ./conf/* /etc/cloudflared/

# CMD ["cloudflared", "tunnel", "run", "transcend"]
CMD ["tunnel", "--config", "/etc/cloudflared/config.yml", "run"]
