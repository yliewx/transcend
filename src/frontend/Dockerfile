#--------------------------------FRONTEND--------------------------------

FROM node:23-bullseye

WORKDIR /usr/src/app

# copy package.json and package-lock.json into container
COPY ./package*.json ./

# install dependencies
RUN npm install --include-dev

# copy source files
COPY . .

# build project
RUN npm run build

EXPOSE 8080

# use nginx later for secure https connection
# serve -s: always return index.html for client-side routing
# CMD [ "npx", "serve", "-s", "public", "-l", "8080" ]
# CMD [ "npm", "start" ]
