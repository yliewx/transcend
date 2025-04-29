#--------------------------------PONG-CLI--------------------------------

FROM node:23-bullseye

WORKDIR /usr/src/app

COPY ./package*.json ./
COPY ./setup-pong-cli.sh ./
COPY ./index.js ./

RUN chmod +x setup-pong-cli.sh && ./setup-pong-cli.sh
