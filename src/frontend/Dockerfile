#--------------------------------FRONTEND--------------------------------

FROM node:23-bullseye

ARG BASE_API_URL
ARG BASE_WSS_URL
ARG GOOGLE_CLIENT_ID

WORKDIR /usr/src/app

# copy package.json and package-lock.json into container
COPY ./package*.json ./

# install dependencies
RUN npm install --include-dev

# copy source files
COPY . .

# build project
RUN BASE_API_URL=$BASE_API_URL \
    BASE_WSS_URL=$BASE_WSS_URL \
    GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
    npm run build

EXPOSE 8080

# serve with nginx to ensure secure https connection
