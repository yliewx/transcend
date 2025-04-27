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
    let keyHoldTimeouts = {};    // Store timeouts to detect if key is held

    const movementInterval = 20; // ms
    const holdThreshold = 100;   // Time in ms to consider a key as "held" vs "tapped"

    process.stdin.on('data', (key) => {
        if (EXIT_KEYS.has(key)) { // Ctrl+C, Ctrl+D, or Escape
        console.log(chalk.yellow('\nExiting pong-cli'));
        socket.close();
        process.exit(0);
        }

        if (PAUSE_KEYS.has(key)) {
        console.log(chalk.cyan('❚❚ Pausing / Resuming game'));
        socket.send(JSON.stringify({ type: 'pause', data: { gameId } }));
        return;
        }

        if (key === START_KEY && !gameStarted) {
        console.log(chalk.cyan('► Starting game'));
        socket.send(JSON.stringify({ type: 'start', data: { gameId } }));
        gameStarted = true;
        return;
        }

        // Handle key press
        handleKeyPress(key);
    });

    function handleKeyPress(key) {
        // If this is a new key press
        if (!pressedKeys[key]) {
        pressedKeys[key] = true;
        
        // Handle inputs immediately (for responsive single taps)
        if (gameMode === 'local') {
            handleLocalInput(key);
        } else {
            handleRemoteInput(key);
        }
        
        // Set a timeout to detect if the key is being held
        keyHoldTimeouts[key] = setTimeout(() => {
            // The key has been held long enough, start continuous movement
            startMovementInterval(key);
            // Clear the timeout reference
            keyHoldTimeouts[key] = null;
        }, holdThreshold);

        // Handle key release after a delay (in case keyup event is missed)
        setTimeout(() => {
            if (pressedKeys[key]) {
            // Setup listener for key release
            const checkKeyReleased = setInterval(() => {
                // This will run periodically to check if the key press is still registered
                // If a key release was detected elsewhere, this will be false
                if (!pressedKeys[key]) {
                clearInterval(checkKeyReleased);
                }
            }, 100);
            }
        }, 50);
        }
    }

    // Handle key release for a specific key
    process.stdin.once('keyup', (key) => {
        handleKeyRelease(key);
    });

    function handleKeyRelease(key) {
        // Clear the key pressed state
        pressedKeys[key] = false;

        // Clear any pending hold detection timeout
        if (keyHoldTimeouts[key]) {
        clearTimeout(keyHoldTimeouts[key]);
        keyHoldTimeouts[key] = null;
        }

        // Clear any movement interval
        if (movementIntervals[key]) {
        clearInterval(movementIntervals[key]);
        movementIntervals[key] = null;
        }

        // Send paddle stop command if needed
        sendPaddleStop(key);
    }

    function sendPaddleStop(key) {
        let side = null;
        if (gameMode === 'local') {
        if (key === KEYS.UP_ARROW || key === KEYS.DOWN_ARROW) {
            side = 'right';
        } else if (LEFT_UP_KEYS.has(key) || LEFT_DOWN_KEYS.has(key)) {
            side = 'left';
        }
        }

        const payload = {
        type: 'input',
        data: {
            gameId,
            input: {
            paddleUp: false,
            paddleDown: false
            }
        }
        };

        if (side) {
        payload.data.side = side;
        }

        socket.send(JSON.stringify(payload));
    }

    function handleRemoteInput(key) {
        if (key === KEYS.UP_ARROW) { // Up arrow
        console.log(chalk.cyan('▲ UP'));
        sendPaddleInput(socket, gameId, { paddleUp: true, paddleDown: false });
        } else if (key === KEYS.DOWN_ARROW) { // Down arrow
        console.log(chalk.cyan('▼ DOWN'));
        sendPaddleInput(socket, gameId, { paddleUp: false, paddleDown: true });
        }
    }

    function handleLocalInput(key) {
        if (key === KEYS.UP_ARROW) { // Up arrow for right paddle
        console.log(chalk.cyan('▲ RIGHT UP'));
        sendPaddleInput(socket, gameId, { paddleUp: true, paddleDown: false, side: 'right' });
        } else if (key === KEYS.DOWN_ARROW) { // Down arrow for right paddle
        console.log(chalk.cyan('▼ RIGHT DOWN'));
        sendPaddleInput(socket, gameId, { paddleUp: false, paddleDown: true, side: 'right' });
        } else if (LEFT_UP_KEYS.has(key)) { // W for left paddle up
        console.log(chalk.cyan('▲ LEFT UP'));
        sendPaddleInput(socket, gameId, { paddleUp: true, paddleDown: false, side: 'left' });
        } else if (LEFT_DOWN_KEYS.has(key)) { // S for left paddle down
        console.log(chalk.cyan('▼ LEFT DOWN'));
        sendPaddleInput(socket, gameId, { paddleUp: false, paddleDown: true, side: 'left' });
        }
    }

    function startMovementInterval(key) {
        // If there's already an interval for the key, don't start a new one
        if (movementIntervals[key]) return;

        let input;
        if (gameMode === 'local') {
        if (key === KEYS.UP_ARROW) {
            input = { paddleUp: true, paddleDown: false, side: 'right' };
        } else if (key === KEYS.DOWN_ARROW) {
            input = { paddleUp: false, paddleDown: true, side: 'right' };
        } else if (LEFT_UP_KEYS.has(key)) {
            input = { paddleUp: true, paddleDown: false, side: 'left' };
        } else if (LEFT_DOWN_KEYS.has(key)) {
            input = { paddleUp: false, paddleDown: true, side: 'left' };
        }
        } else {
        if (key === KEYS.UP_ARROW) {
            input = { paddleUp: true, paddleDown: false };
        } else if (key === KEYS.DOWN_ARROW) {
            input = { paddleUp: false, paddleDown: true };
        }
        }

        if (!input) return; // Not a movement key

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

    // Update pressedKeys state for keyup events
    const originalStdinListener = process.stdin._events.data;
    process.stdin.on('data', function keyupDetection(key) {
        // This will mark keys as no longer pressed after a very short delay
        // to simulate keyup events which aren't directly available in raw mode
        setTimeout(() => {
        if (pressedKeys[key]) {
            handleKeyRelease(key);
        }
        }, 50); // Very short delay to allow for the normal key handler to process first
    });

    return function cleanup() {
        if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
        }
        process.stdin.pause();
        // Clean up all intervals and timeouts
        Object.keys(movementIntervals).forEach(key => {
        if (movementIntervals[key]) {
            clearInterval(movementIntervals[key]);
        }
        });
        Object.keys(keyHoldTimeouts).forEach(key => {
        if (keyHoldTimeouts[key]) {
            clearTimeout(keyHoldTimeouts[key]);
        }
        });
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
            console.log(chalk.green('All players connected. Press Enter to start the game.'));
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