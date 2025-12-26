#---------------------------------SERVER---------------------------------

FROM debian:bullseye

RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y curl dnsutils iputils-ping ca-certificates && \
    apt-get clean

RUN curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && \
    chmod +x /usr/local/bin/cloudflared

RUN mkdir -p /etc/cloudflared

COPY ./conf/* /etc/cloudflared/

COPY ./tools/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER root

ENTRYPOINT ["/entrypoint.sh"]    
