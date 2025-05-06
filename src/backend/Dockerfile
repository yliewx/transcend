#---------------------------------SERVER---------------------------------

FROM node:23-bullseye

WORKDIR /usr/src/app

RUN apt-get update && apt-get upgrade -y && apt-get install sqlite3

COPY ./package*.json ./

RUN npm install

RUN mkdir -p /usr/src/app/public/uploads/avatars

COPY ./assets/default-avatar.jpg /usr/src/app/public/uploads/avatars/

COPY . .

RUN npm run build

EXPOSE 3000

ENV FORCE_COLOR=1

USER root

CMD [ "npm", "run", "start" ]