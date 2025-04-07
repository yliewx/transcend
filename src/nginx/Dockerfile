#---------------------------------NGINX----------------------------------

# define base for the image
FROM nginx:latest

# create ssl directory
RUN mkdir -p /etc/nginx/ssl /usr/share/nginx/html

# create ssl certificate
RUN openssl \
	# create self-signed cert in X.509 standard
	req -x509 \
	# skip passphrase
	-nodes \
	# specify the cert's validity period
	-days 365 \
	# generate new RSA key of 2048 bits in length
	-newkey rsa:2048 \ 
	# specify file paths for the private key and cert
	-keyout /etc/nginx/ssl/transcend.key \
	-out /etc/nginx/ssl/transcend.crt \
	# specify common name (hostname)
	-subj "/CN=transcend.42.fr/"

# copy config file into nginx container
COPY ./conf/default.conf /etc/nginx/conf.d

# listen on port 443 only
EXPOSE 443

# run nginx in the foreground
ENTRYPOINT [ "nginx", "-g", "daemon off;" ]
