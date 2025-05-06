#---------------------------------NGINX----------------------------------

FROM nginx:latest

RUN mkdir -p /etc/nginx/ssl /usr/share/nginx/html

COPY ./ssl/transcend.crt /etc/nginx/ssl/transcend.crt
COPY ./ssl/transcend.key /etc/nginx/ssl/transcend.key
RUN chmod 644 /etc/nginx/ssl/transcend.crt && \
    chmod 600 /etc/nginx/ssl/transcend.key

COPY ./conf/default.conf /etc/nginx/conf.d

EXPOSE 443

USER root

ENTRYPOINT [ "nginx", "-g", "daemon off;" ]
