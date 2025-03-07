FROM node:23-bullseye

WORKDIR /usr/src/app

# copy package.json and package-lock.json into container
COPY ./package*.json ./

# install dependencies
RUN npm install

COPY . .

# build project
RUN npm run build

EXPOSE 8080

# run server
ENTRYPOINT [ "npm", "start" ]
