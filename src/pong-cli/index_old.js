#!/usr/bin/env node

const WebSocket = require('ws');
const axios = require('axios');
const blessed = require('blessed');
const https = require('https');
const commandLineArgs = require('command-line-args');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CONFIG = {
  apiUrl: process.env.PONG_API_URL || 'https://localhost:8080/api',
  wsUrl: process.env.PONG_WS_URL || 'wss://localhost:8080/ws'
};

// Create https agent for self-signed certs (development only)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// CLI options
const optionDefinitions = [
  { name: 'help', alias: 'h', type: Boolean, description: 'Display this help message' },
  { name: 'token', alias: 't', type: String, description: 'Authentication token' },
  { name: 'create', alias: 'c', type: Boolean, description: 'Create a new game' },
  { name: 'join', alias: 'j', type: String, description: 'Join a game with ID' },
  { name: 'mode', alias: 'm', type: String, description: 'Game mode (local or remote)', defaultValue: 'remote' }
];

let options;
try {
  options = commandLineArgs(optionDefinitions);
} catch (e) {
  console.error('Error parsing arguments:', e.message);
  showHelp();
  process.exit(1);
}

if (options.help) {
  showHelp();
  process.exit(0);
}

// State
let authToken = options.token;
let gameId = null;
let gameSocket = null;
let gameState = null;
let screen = null;
let gameBox = null;
let infoBox = null;
let scoreBox = null;

// Config file path
const CONFIG_FILE = path.join(os.homedir(), '.pong-cli', 'config.json');

// Show help message
function showHelp() {
  console.log('Pong CLI - Play against web users from your terminal');
  console.log('\nUsage:');
  console.log('  pong-cli [options]');
  console.log('\nOptions:');
  optionDefinitions.forEach(option => {
    const flags = [];
    if (option.alias) flags.push(`-${option.alias}`);
    if (option.name) flags.push(`--${option.name}`);
    
    console.log(`  ${flags.join(', ').padEnd(20)} ${option.description}`);
  });
  console.log('\nExamples:');
  console.log('  pong-cli --token "your-auth-token" --create');
  console.log('  pong-cli --token "your-auth-token" --join abc123');
  console.log('  pong-cli --create                    # If token is already saved');
}

// Save token to config file
function saveToken(token) {
  try {
    const configDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({
      token
    }));
    console.log(chalk.green('Saved authentication token'));
  } catch (error) {
    console.error(chalk.yellow('Could not save token:'), error.message);
  }
}

// Load token from config file if not provided
function loadSavedToken() {
  if (authToken) return true;
  
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (!authToken) authToken = config.token;
      console.log(chalk.green(`Loaded saved authentication token`));
      return true;
    }
  } catch (error) {
    console.error(chalk.yellow('Could not load saved token:'), error.message);
  }
  return false;
}

// Check if we have the required authentication info
async function ensureAuthenticated() {
  // Try to load saved token if not provided
  if (!loadSavedToken()) {
    console.error(chalk.red('Authentication token is required'));
    console.log('Use --token option to provide authentication');
    console.log('Example: pong-cli --token "your-auth-token" --create');
    process.exit(1);
  }
  
  // Save token for future use
  saveToken(authToken);
}

// Start the CLI
async function startCli() {
  await ensureAuthenticated();
  
  // Process command arguments
  if (options.create) {
    await createGame(options.mode);
  } else if (options.join) {
    await joinGame(options.join);
  } else {
    console.log('Please specify an action: --create, --join, or --help for more options');
    process.exit(0);
  }
}

// Create a new game
async function createGame(mode) {
  try {
    const response = await axios.post(
      `${CONFIG.apiUrl}/game/create`,
      { mode },
      { 
        headers: { Authorization: `Bearer ${authToken}` },
        httpsAgent
      }
    );
    
    if (response.data.success) {
      gameId = response.data.gameId;
      console.log(chalk.green(`Game created with ID: ${gameId}`));
      
      // Connect to the game
      connectToGame(gameId);
    } else {
      console.error(chalk.red('Failed to create game:'), response.data.message);
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Error creating game:'), error.response?.data?.message || error.message);
    process.exit(1);
  }
}

// Join an existing game
async function joinGame(id) {
  gameId = id;
  console.log(chalk.blue(`Joining game ${gameId}...`));
  
  // Connect to the game
  connectToGame(gameId);
}

// Connect to game via WebSocket
function connectToGame(id) {
  const wsOptions = {
    rejectUnauthorized: false,
    headers: { 
      Authorization: `Bearer ${authToken}`
    }
  };
  
  gameSocket = new WebSocket(`${CONFIG.wsUrl}/pong/${id}`, wsOptions);
  
  gameSocket.on('open', () => {
    console.log(chalk.green('Connected to game server'));
    
    // Join the game room
    gameSocket.send(JSON.stringify({
      type: 'join',
      data: {
        gameId: id
      }
    }));
    
    // Start the UI
    setupGameScreen();
  });
  
  gameSocket.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleGameMessage(message);
    } catch (e) {
      if (infoBox) {
        infoBox.log('Received non-JSON message: ' + data.toString());
        screen.render();
      } else {
        console.log('Received non-JSON message:', data.toString());
      }
    }
  });
  
  gameSocket.on('error', (error) => {
    if (infoBox) {
      infoBox.log(chalk.red('WebSocket error: ' + error.message));
      screen.render();
    } else {
      console.error(chalk.red('WebSocket error:'), error);
    }
  });
  
  gameSocket.on('close', () => {
    if (infoBox) {
      infoBox.log(chalk.yellow('Disconnected from game server'));
      screen.render();
    } else {
      console.log(chalk.yellow('Disconnected from game server'));
    }
    
    // Give user time to see the disconnection message
    setTimeout(() => {
      process.exit(0);
    }, 3000);
  });
}

// Set up the terminal UI
function setupGameScreen() {
  // Create a blessed screen
  screen = blessed.screen({
    smartCSR: true,
    title: 'Pong CLI'
  });
  
  // Create a box for the game
  gameBox = blessed.box({
    top: 0,
    left: 0,
    width: '70%',
    height: '80%',
    border: {
      type: 'line'
    },
    style: {
      border: {
        fg: 'white'
      }
    }
  });
  
  // Create a box for information
  infoBox = blessed.log({
    top: '80%',
    left: 0,
    width: '100%',
    height: '20%',
    border: {
      type: 'line'
    },
    style: {
      border: {
        fg: 'white'
      }
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray'
      },
      style: {
        inverse: true
      }
    }
  });
  
  // Create a score box
  scoreBox = blessed.box({
    top: 0,
    left: '70%',
    width: '30%',
    height: '20%',
    border: {
      type: 'line'
    },
    style: {
      border: {
        fg: 'white'
      },
      fg: 'green',
      bold: true
    },
    content: 'Score: 0 - 0'
  });
  
  // Create a controls box
  const controlsBox = blessed.box({
    top: '20%',
    left: '70%',
    width: '30%',
    height: '60%',
    border: {
      type: 'line'
    },
    style: {
      border: {
        fg: 'white'
      }
    },
    content: 'Controls:\n\n' +
             '↑ - Move paddle up\n' +
             '↓ - Move paddle down\n\n' +
             'S - Start game\n' +
             'P - Pause game\n' +
             'Q - Quit game'
  });
  
  // Add boxes to screen
  screen.append(gameBox);
  screen.append(infoBox);
  screen.append(scoreBox);
  screen.append(controlsBox);
  
  // Handle key inputs
  screen.key(['escape', 'q', 'C-c'], function() {
    if (gameSocket) {
      gameSocket.close();
    }
    return process.exit(0);
  });
  
  screen.key('s', function() {
    if (gameState && (gameState.status === 'waiting' || gameState.status === 'paused')) {
      infoBox.log('Starting game...');
      screen.render();
      
      gameSocket.send(JSON.stringify({
        type: 'start',
        data: {
          gameId: gameId
        }
      }));
    }
  });
  
  screen.key('p', function() {
    if (gameState && gameState.status === 'playing') {
      infoBox.log('Pausing game...');
      screen.render();
      
      gameSocket.send(JSON.stringify({
        type: 'pause',
        data: {
          gameId: gameId
        }
      }));
    }
  });
  
  screen.key(['up', 'down'], function(ch, key) {
    if (!gameState || gameState.status !== 'playing') return;
    
    const paddleUp = key.name === 'up';
    const paddleDown = key.name === 'down';
    
    gameSocket.send(JSON.stringify({
      type: 'input',
      data: {
        gameId: gameId,
        input: { paddleUp, paddleDown }
      }
    }));
  });
  
  // Initial info message
  infoBox.log('Connected to Pong server. Waiting for game to start...');
  
  // Render the screen
  screen.render();
}

// Draw the game state on the screen
function drawGame() {
  if (!gameState || !gameBox) return;
  
  const { ballX, ballY, paddleLeftY, paddleRightY, scoreLeft, scoreRight, status } = gameState;
  
  // Game dimensions
  const gameWidth = 800;
  const gameHeight = 600;
  
  // Box dimensions (character cells)
  const boxWidth = Math.floor(gameBox.width * 2); // each cell is roughly half as wide as it is tall
  const boxHeight = Math.floor(gameBox.height);
  
  // Scale coordinates
  const scaleX = (x) => Math.floor((x / gameWidth) * boxWidth);
  const scaleY = (y) => Math.floor((y / gameHeight) * boxHeight);
  
  // Create an empty canvas
  const canvas = Array(boxHeight).fill(0).map(() => Array(boxWidth).fill(' '));
  
  // Draw center line
  for (let y = 0; y < boxHeight; y += 2) {
    const x = Math.floor(boxWidth / 2);
    canvas[y][x] = '|';
  }
  
  // Draw paddles
  const paddleHeight = 100;
  const paddleWidth = 10;
  const scaledLeftY = scaleY(paddleLeftY);
  const scaledRightY = scaleY(paddleRightY);
  const scaledPaddleHeight = scaleY(paddleHeight);
  
  for (let y = 0; y < scaledPaddleHeight; y++) {
    if (scaledLeftY + y < boxHeight) {
      canvas[scaledLeftY + y][1] = '█';
    }
    
    if (scaledRightY + y < boxHeight) {
      canvas[scaledRightY + y][boxWidth - 2] = '█';
    }
  }
  
  // Draw ball
  const scaledBallX = scaleX(ballX);
  const scaledBallY = scaleY(ballY);
  
  if (scaledBallX >= 0 && scaledBallX < boxWidth && 
      scaledBallY >= 0 && scaledBallY < boxHeight) {
    canvas[scaledBallY][scaledBallX] = 'O';
  }
  
  // Render the canvas
  let content = '';
  for (let y = 0; y < boxHeight; y++) {
    content += canvas[y].join('') + '\n';
  }
  
  // Update the game box
  gameBox.setContent(content);
  
  // Update score box
  scoreBox.setContent(`Score: ${scoreLeft} - ${scoreRight}`);
  
  if (status === 'finished') {
    const winner = gameState.winner === 'left' ? 'Left' : 'Right';
    infoBox.log(`Game over! ${winner} player wins!`);
  }
  
  // Render the screen
  screen.render();
}

// Handle messages from the game server
function handleGameMessage(message) {
  const { type, data } = message;
  
  switch (type) {
    case 'player-joined':
      infoBox.log(`Joined game successfully!`);
      gameState = data.state;
      
      if (data.ready) {
        infoBox.log('All players are ready. Press S to start the game.');
      } else {
        infoBox.log('Waiting for other players to join...');
      }
      
      drawGame();
      break;
      
    case 'start':
      infoBox.log('Game started!');
      gameState = data;
      drawGame();
      break;
      
    case 'update':
      gameState = data;
      drawGame();
      break;
      
    case 'error':
      infoBox.log(`Error: ${data}`);
      screen.render();
      break;
  }
}

// Start the application
startCli().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});