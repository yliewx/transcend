#---------------------------------NGINX----------------------------------

# define base for the image
FROM nginx:latest

# create ssl directory
RUN mkdir -p /etc/nginx/ssl /usr/share/nginx/html

# copy ssl certificate
COPY ./ssl/transcend.crt /etc/nginx/ssl/transcend.crt
COPY ./ssl/transcend.key /etc/nginx/ssl/transcend.key
RUN chmod 644 /etc/nginx/ssl/transcend.crt && \
    chmod 600 /etc/nginx/ssl/transcend.key

# copy config file into nginx container
COPY ./conf/default.conf /etc/nginx/conf.d

# listen on port 443 only
EXPOSE 443

# run nginx in the foreground
ENTRYPOINT [ "nginx", "-g", "daemon off;" ]
