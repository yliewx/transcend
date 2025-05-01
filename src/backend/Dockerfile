#---------------------------------SERVER---------------------------------

FROM node:23-bullseye

WORKDIR /usr/src/app

# for debugging
RUN apt-get update && apt-get upgrade -y && apt-get install sqlite3

# copy package.json and package-lock.json into container
COPY ./package*.json ./

# install dependencies
RUN npm install

# Create necessary directories
RUN mkdir -p /usr/src/app/public/uploads/avatars

# Copy default avatar
COPY ./assets/default-avatar.png /usr/src/app/public/uploads/avatars/

# copy source files
COPY . .

# build project
RUN npm run build

EXPOSE 3000

ENV FORCE_COLOR=1

# run server
CMD [ "npm", "run", "start" ]