#--------------------------------FRONTEND--------------------------------

FROM node:23-bullseye

ARG BASE_API_URL
ARG BASE_WSS_URL
ARG GOOGLE_CLIENT_ID

WORKDIR /usr/src/app

COPY ./package*.json ./

RUN npm install --include-dev

COPY . .

RUN BASE_API_URL=$BASE_API_URL \
    BASE_WSS_URL=$BASE_WSS_URL \
    GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
    npm run build

USER root

EXPOSE 8080