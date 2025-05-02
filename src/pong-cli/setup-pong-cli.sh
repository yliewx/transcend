#!/bin/bash

RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
NC='\033[0m'

CLI_DIR="./"

echo -e "${YELLOW}=== Installing Pong CLI Client ===${NC}"

if [ ! -d "$CLI_DIR" ]; then
  echo -e "${RED}Error: Directory $CLI_DIR does not exist${NC}"
  exit 1
fi

if [ ! -f "$CLI_DIR/index.js" ]; then
  echo -e "${RED}Error: $CLI_DIR/index.js does not exist${NC}"
  exit 1
fi

cd "$CLI_DIR"

if [ ! -f "package.json" ]; then
  echo -e "${BLUE}Creating package.json...${NC}"
  cat > package.json << EOF
{
  "name": "pong-cli",
  "version": "1.0.0",
  "description": "CLI client for Pong game",
  "main": "index.js",
  "bin": {
    "pong-cli": "./index.js"
  },
  "scripts": {
    "start": "node index.js"
  },
  "keywords": ["pong", "cli", "game"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "axios": "^1.6.2",
    "blessed": "^0.1.81",
    "blessed-contrib": "^4.11.0",
    "chalk": "^4.1.2",
    "command-line-args": "^5.2.1",
    "prompt": "^1.3.0",
    "ws": "^8.14.2"
  }
}
EOF
fi

echo -e "${BLUE}Installing dependencies...${NC}"
npm install

echo -e "${BLUE}Making index.js executable...${NC}"
chmod +x index.js

echo -e "${BLUE}Creating global symlink...${NC}"
npm link

echo -e "${GREEN}Installation complete!${NC}"
echo -e "You can now use the Pong CLI with: ${YELLOW}pong-cli --help${NC}"