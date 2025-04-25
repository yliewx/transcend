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

// Create https agent for self-signed certs (development only)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

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
  console.log('  SPACE       - Stop paddle movement');
  console.log('  S           - Start game');
  console.log('  P           - Pause game');
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

// Setup keyboard input for raw mode
function setupKeyboardInput(socket, gameId) {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  
  // Current state of paddle
  let currentState = {
    paddleUp: false,
    paddleDown: false
  };
  
  // Send initial state
  sendPaddleInput(socket, gameId, currentState);
  
  process.stdin.on('data', (key) => {
    // Check for ctrl-c or q to exit
    if (key === '\u0003' || key === 'q' || key === 'Q') {
      console.log(chalk.yellow('\nExiting pong-cli'));
      socket.close();
      process.exit(0);
    }
    
    let stateChanged = false;
    let previousState = { ...currentState };
    
    // Arrow up pressed
    if (key === '\u001B\u005B\u0041') {
      currentState = { paddleUp: true, paddleDown: false };
      stateChanged = true;
      console.log(chalk.cyan('▲ UP'));
    }
    // Arrow down pressed
    else if (key === '\u001B\u005B\u0042') {
      currentState = { paddleUp: false, paddleDown: true };
      stateChanged = true;
      console.log(chalk.cyan('▼ DOWN'));
    }
    // Space pressed - stop movement
    else if (key === ' ') {
      currentState = { paddleUp: false, paddleDown: false };
      stateChanged = true;
      console.log(chalk.cyan('■ STOP'));
    }
    // S pressed - start game
    else if (key === 's' || key === 'S') {
      console.log(chalk.cyan('► Starting game'));
      socket.send(JSON.stringify({
        type: 'start',
        data: { gameId }
      }));
    }
    // P pressed - pause game
    else if (key === 'p' || key === 'P') {
      console.log(chalk.cyan('❚❚ Pausing game'));
      socket.send(JSON.stringify({
        type: 'pause',
        data: { gameId }
      }));
    }
    
    // Only send updates when the state has changed
    if (stateChanged && (previousState.paddleUp !== currentState.paddleUp || 
                          previousState.paddleDown !== currentState.paddleDown)) {
      sendPaddleInput(socket, gameId, currentState);
    }
  });
  
  // Function to send paddle input to server
  function sendPaddleInput(socket, gameId, state) {
    if (socket.readyState !== WebSocket.OPEN) return;
    
    socket.send(JSON.stringify({
      type: 'input',
      data: {
        gameId,
        input: state
      }
    }));
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
  
  const socket = new WebSocket(`${CONFIG.wsUrl}/pong/${gameId}`, wsOptions);
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
    console.log(chalk.cyan('SPACE') + ' - Stop paddle');
    console.log(chalk.cyan('S') + ' - Start game');
    console.log(chalk.cyan('P') + ' - Pause game');
    console.log(chalk.cyan('Q') + ' - Quit');
    
    // Setup keyboard input
    cleanupInput = setupKeyboardInput(socket, gameId);
  });
  
  socket.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Only log non-update messages to avoid spam
      if (message.type !== 'update') {
        console.log(chalk.yellow(`[${message.type}]`), 
          message.type === 'error' ? chalk.red(message.data) : '');
        
        // Check for game state changes
        if (message.type === 'start') {
          console.log(chalk.green('Game started!'));
        } else if (message.type === 'player-joined') {
          if (message.data.ready) {
            console.log(chalk.green('All players connected. Press S to start the game.'));
          } else {
            console.log(chalk.yellow('Waiting for opponent to connect...'));
          }
        }
      }
    } catch (e) {
      console.log(chalk.yellow('Received:'), data.toString());
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