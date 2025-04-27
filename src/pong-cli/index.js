#!/usr/bin/env node

const WebSocket = require('ws');
const https = require('https');
const readline = require('readline');
const commandLineArgs = require('command-line-args');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CONFIG = {
  wsUrl: process.env.PONG_WS_URL || 'wss://localhost:8080/ws'
};

// CLI options
const optionDefinitions = [
  { name: 'help', alias: 'h', type: Boolean, description: 'Display this help message' },
  { name: 'token', alias: 't', type: String, description: 'Authentication token' },
  { name: 'game', alias: 'g', type: String, description: 'Game ID to connect to' },
  { name: 'clear', type: Boolean, description: 'Clear saved configuration' }
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

// Global variables for game
let gameMode;
let gameStarted;

// Define keys for key bindings
const KEYS = {
  CTRL_C: '\u0003',
  CTRL_D: '\u0004',
  ESCAPE: '\u001B',
  UP_ARROW: '\u001B\u005B\u0041',
  DOWN_ARROW: '\u001B\u005B\u0042',
  ENTER: '\r',
  P: 'p',
  P_CAP: 'P',
  W: 'w',
  W_CAP: 'W',
  S: 's',
  S_CAP: 'S'
};
const START_KEY = KEYS.ENTER;
const EXIT_KEYS = new Set([KEYS.CTRL_C, KEYS.CTRL_D, KEYS.ESCAPE]);
const PAUSE_KEYS = new Set([KEYS.P, KEYS.P_CAP]);
const LEFT_UP_KEYS = new Set([KEYS.W, KEYS.W_CAP]);
const LEFT_DOWN_KEYS = new Set([KEYS.S, KEYS.S_CAP]);

// Config file path
const CONFIG_FILE = path.join(os.homedir(), '.pong-cli', 'config.json');

// Show help message
function showHelp() {
  console.log(chalk.green('Pong CLI - Control your paddle from the command line'));
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
  console.log('  pong-cli --token "your-token" --game "game-id"     # Connect with specified credentials');
  console.log('  pong-cli                                           # Connect using saved credentials');
  console.log('  pong-cli --clear                                   # Clear saved configuration');
  console.log('\nControls:');
  console.log('  UP arrow    - Move paddle up');
  console.log('  DOWN arrow  - Move paddle down');
  console.log('  S           - Start game');
  console.log('  P           - Pause / Resume game');
  console.log('  Q           - Quit');
}

// Save config to file
function saveConfig(token, gameId) {
  try {
    const configDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Load existing config first
    let config = {};
    if (fs.existsSync(CONFIG_FILE)) {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    
    // Update only the provided values
    if (token) config.token = token;
    if (gameId) config.gameId = gameId;
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    
    if (token || gameId) {
      console.log(chalk.green('Configuration saved'));
    }
  } catch (error) {
    console.error(chalk.yellow('Could not save configuration:'), error.message);
  }
}

// Load config from file
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (error) {
    console.error(chalk.yellow('Could not load configuration:'), error.message);
  }
  return {};
}

// Clear saved configuration
function clearConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
      console.log(chalk.green('Saved configuration cleared'));
    } else {
      console.log(chalk.yellow('No saved configuration found'));
    }
  } catch (error) {
    console.error(chalk.red('Error clearing configuration:'), error.message);
  }
}


function setupKeyboardInput(socket, gameId) {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  let pressedKeys = {};
  let movementIntervals = {};  // Store active intervals for each key

  const movementInterval = 60; // ms

  process.stdin.on('data', (key) => {
    if (EXIT_KEYS.has(key)) { // Ctrl+C, Ctrl+D, or Escape
      console.log(chalk.yellow('\nExiting pong-cli'));
      socket.close();
      process.exit(0);
    }

    if (PAUSE_KEYS.has(key)) {
      console.log(chalk.cyan('❚❚ Pausing / Resuming game'));
      socket.send(JSON.stringify({ type: 'pause', data: { gameId } }));
    }

    if (key === START_KEY && !gameStarted) {
      console.log(chalk.cyan('► Starting game'));
      socket.send(JSON.stringify({ type: 'start', data: { gameId } }));
      gameStarted = true;
    }

    if (pressedKeys[key]) {
      return; // Ignore repeated keypress events
    }
    pressedKeys[key] = true;

    // Handle inputs based on game mode
    if (gameMode === 'local') {
      handleLocalInput(key);
    } else {
      handleRemoteInput(key);
    }

    // Debounce: Clear key after a delay
    setTimeout(() => {
      pressedKeys[key] = false;
    }, 100);
  });

  function handleRemoteInput(key) {
    if (key === KEYS.UP_ARROW) { // Up arrow
      console.log(chalk.cyan('▲ UP'));
      sendPaddleInput(socket, gameId, { paddleUp: true, paddleDown: false });
      startMovementInterval(key, { paddleUp: true, paddleDown: false });
    } else if (key === KEYS.DOWN_ARROW) { // Down arrow
      console.log(chalk.cyan('▼ DOWN'));
      sendPaddleInput(socket, gameId, { paddleUp: false, paddleDown: true });
      startMovementInterval(key, { paddleUp: false, paddleDown: true });
    }
  }

  function handleLocalInput(key) {
    if (key === KEYS.UP_ARROW) { // Up arrow for right paddle
      console.log(chalk.cyan('▲ RIGHT UP'));
      sendPaddleInput(socket, gameId, { paddleUp: true, paddleDown: false, side: 'right' });
      startMovementInterval(key, { paddleUp: true, paddleDown: false, side: 'right' });
    } else if (key === KEYS.DOWN_ARROW) { // Down arrow for right paddle
      console.log(chalk.cyan('▼ RIGHT DOWN'));
      sendPaddleInput(socket, gameId, { paddleUp: false, paddleDown: true, side: 'right' });
      startMovementInterval(key, { paddleUp: false, paddleDown: true, side: 'right' });
    } else if (LEFT_UP_KEYS.has(key)) { // W for left paddle up
      console.log(chalk.cyan('▲ LEFT UP'));
      sendPaddleInput(socket, gameId, { paddleUp: true, paddleDown: false, side: 'left' });
      startMovementInterval(key, { paddleUp: true, paddleDown: false, side: 'left' });
    } else if (LEFT_DOWN_KEYS.has(key)) { // S for left paddle down
      console.log(chalk.cyan('▼ LEFT DOWN'));
      sendPaddleInput(socket, gameId, { paddleUp: false, paddleDown: true, side: 'left' });
      startMovementInterval(key, { paddleUp: false, paddleDown: true, side: 'left' });
    }
  }

  function startMovementInterval(key, input) {
    // If there's already an interval for the key, don't start a new one
    if (movementIntervals[key]) return;

    const intervalId = setInterval(() => {
      if (!pressedKeys[key]) {
        clearInterval(intervalId);
        movementIntervals[key] = null; // Clear the interval reference
      } else {
        sendPaddleInput(socket, gameId, input);
      }
    }, movementInterval);

    // Store the intervalId so it can be cleared when needed
    movementIntervals[key] = intervalId;
  }

  function sendPaddleInput(socket, gameId, state) {
    if (socket.readyState !== WebSocket.OPEN) return;
  
    const payload = {
      type: 'input',
      data: {
        gameId,
        input: {
          paddleUp: state.paddleUp,
          paddleDown: state.paddleDown
        }
      }
    };
  
    // Local mode: If side exists in the input state
    if (gameMode === 'local' && state.side) {
      payload.data.side = state.side;
    }
  
    socket.send(JSON.stringify(payload));
  }  

  return function cleanup() {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  };
}

async function startCli() {
  // Handle clear config command
  if (options.clear) {
    clearConfig();
    return;
  }

  // Load saved config
  const config = loadConfig();
  
  // Get token from command line or saved config
  const token = options.token || config.token;
  if (!token) {
    console.error(chalk.red('Authentication token is required'));
    console.log('Use --token option to provide authentication');
    process.exit(1);
  }
  
  // Get game ID from command line or saved config
  const gameId = options.game || config.gameId;
  if (!gameId) {
    console.error(chalk.red('Game ID is required'));
    console.log('Use --game option to specify the game ID');
    process.exit(1);
  }
  
  // Save credentials for future use
  saveConfig(token, gameId);
  
  // Connect to game with persistent connection
  await connectToGame(token, gameId);
}

async function connectToGame(token, gameId) {
  const wsOptions = {
    rejectUnauthorized: false,
    headers: { 
      Authorization: `Bearer ${token}`
    }
  };
  
  console.log(chalk.blue(`Connecting to game ${gameId}...`));
  
  const socket = new WebSocket(`${CONFIG.wsUrl}/pong/cli/${gameId}`, wsOptions);
  let cleanupInput = null;
  
  socket.on('open', () => {
    console.log(chalk.green('Connected to game server'));
    
    // Join the game
    socket.send(JSON.stringify({
      type: 'join',
      data: {
        gameId
      }
    }));
    
    console.log(chalk.green('\nReady to play! Use arrow keys to control your paddle:'));
    console.log(chalk.cyan('↑/↓') + ' - Move paddle');
    console.log(chalk.cyan('Enter') + ' - Start game');
    console.log(chalk.cyan('P') + ' - Pause / Resume game');
    console.log(chalk.cyan('Esc') + ' - Quit');
    
    // Setup keyboard input
    cleanupInput = setupKeyboardInput(socket, gameId);
  });
  
  socket.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Only log non-update messages to avoid spam
      if (message.type !== 'update') {
        console.log(chalk.yellow(`[${message.type}]`), 
          message.type === 'error' ? chalk.red(JSON.stringify(message.data, null, 2)) : '');
        
        // Check for game state changes
        if (message.type === 'start') {
          console.log(chalk.green('Game started!'));
        } else if (message.type === 'player-joined') {
          gameMode = message.data.gameMode;
          if (message.data.ready) {
            console.log(chalk.green('All players connected. Press S to start the game.'));
          } else {
            console.log(chalk.yellow('Waiting for opponent to connect...'));
          }
        }
      }
    } catch (e) {
      console.log(chalk.yellow('Received:'), JSON.stringify(data, null, 2));
    }
  });
  
  socket.on('error', (error) => {
    console.error(chalk.red('WebSocket error:'), error.message);
  });
  
  socket.on('close', () => {
    console.log(chalk.yellow('Disconnected from game server'));
    if (cleanupInput) cleanupInput();
    process.exit(0);
  });
  
  // Handle process exit
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\nExiting pong-cli'));
    if (cleanupInput) cleanupInput();
    socket.close();
    process.exit(0);
  });
}

// Start the application
startCli().catch(err => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});