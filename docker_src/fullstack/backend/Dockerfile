FROM node:23-bullseye

WORKDIR /usr/src/app

# copy package.json and package-lock.json into container
COPY ./package*.json ./

# install dependencies
RUN npm install

COPY . .

# Expose the port the server runs on
EXPOSE 3000

# Command to run the server
CMD ["npm", "run", "dev:server"]

# # build project
# RUN npm run build

# EXPOSE 8080

# # run server
# ENTRYPOINT [ "npm", "start" ]
