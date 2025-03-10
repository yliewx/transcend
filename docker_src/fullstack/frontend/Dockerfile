FROM node:23-bullseye

WORKDIR /usr/src/app

# copy package.json and package-lock.json into container
COPY ./package*.json ./

# install dependencies
RUN npm install

# Copy source code
COPY . .
# COPY webpack.config.js tsconfig.json ./
# COPY src ./src/client

# Expose the port webpack-dev-server runs on
EXPOSE 8080

# Command to run webpack-dev-server
# The --host 0.0.0.0 is important to make it accessible outside the container
CMD ["npm", "run", "dev:client", "--", "--host", "0.0.0.0"]
