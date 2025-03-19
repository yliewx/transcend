#---------------------------------SERVER---------------------------------

FROM node:23-bullseye

WORKDIR /usr/src/app

# for debugging
RUN apt-get update && apt-get upgrade -y && apt-get install sqlite3

# copy package.json and package-lock.json into container
COPY ./package*.json ./

# install dependencies
RUN npm install

# copy source files
COPY . .

# build project
RUN npm run build

EXPOSE 3000

# run server
CMD [ "npm", "run", "start" ]
