#!/usr/bin/env node

const WebSocket = require('ws');
const commandLineArgs = require('command-line-args');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG = {
  wsUrl: process.env.PONG_WS_URL || 'wss://parsleypong.com/ws'
};

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

let gameMode;
let gameStarted;

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
const CONFIG_FILE = path.join(os.homedir(), '.pong-cli', 'config.json');

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
  console.log('  Enter       - Start game');
  console.log('  P           - Pause / Resume game');
  console.log('  Esc         - Quit');
}

function saveConfig(token, gameId) {
  try {
    const configDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    let config = {};
    if (fs.existsSync(CONFIG_FILE)) {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    
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
    let movementIntervals = {};
    let keyHoldTimeouts = {};    

    const movementInterval = 20; 
    const holdThreshold = 20;

    process.stdin.on('data', (key) => {
      if (EXIT_KEYS.has(key)) { 
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

      handleKeyPress(key);
    });

    function handleKeyPress(key) {
      if (!pressedKeys[key]) {
        pressedKeys[key] = true;
        
        if (gameMode === 'local') {
            handleLocalInput(key);
        } else {
            handleRemoteInput(key);
        }

        startMovementInterval(key);
        
        keyHoldTimeouts[key] = setTimeout(() => {
            if (!movementIntervals[key]) {
              startMovementInterval(key);
            }
            keyHoldTimeouts[key] = null;
        }, holdThreshold);

        setTimeout(() => {
          if (pressedKeys[key]) {
            const checkKeyReleased = setInterval(() => {
              if (!pressedKeys[key]) {
                clearInterval(checkKeyReleased);
              }
            }, 50);
          }
        }, 50);
      }
    }

    process.stdin.once('keyup', (key) => {
      handleKeyRelease(key);
    });

    function handleKeyRelease(key) {
      pressedKeys[key] = false;

      if (keyHoldTimeouts[key]) {
        clearTimeout(keyHoldTimeouts[key]);
        keyHoldTimeouts[key] = null;
      }

      if (movementIntervals[key]) {
        clearInterval(movementIntervals[key]);
        movementIntervals[key] = null;
      }

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
      if (key === KEYS.UP_ARROW) {
        console.log(chalk.cyan('▲ UP'));
        sendPaddleInput(socket, gameId, { paddleUp: true, paddleDown: false });
      } else if (key === KEYS.DOWN_ARROW) { 
        console.log(chalk.cyan('▼ DOWN'));
        sendPaddleInput(socket, gameId, { paddleUp: false, paddleDown: true });
      }
    }

    function handleLocalInput(key) {
      if (key === KEYS.UP_ARROW) { 
        console.log(chalk.cyan('▲ RIGHT UP'));
        sendPaddleInput(socket, gameId, { paddleUp: true, paddleDown: false, side: 'right' });
      } else if (key === KEYS.DOWN_ARROW) {
        console.log(chalk.cyan('▼ RIGHT DOWN'));
        sendPaddleInput(socket, gameId, { paddleUp: false, paddleDown: true, side: 'right' });
      } else if (LEFT_UP_KEYS.has(key)) { 
        console.log(chalk.cyan('▲ LEFT UP'));
        sendPaddleInput(socket, gameId, { paddleUp: true, paddleDown: false, side: 'left' });
      } else if (LEFT_DOWN_KEYS.has(key)) {
        console.log(chalk.cyan('▼ LEFT DOWN'));
        sendPaddleInput(socket, gameId, { paddleUp: false, paddleDown: true, side: 'left' });
      }
    }

    function startMovementInterval(key) {
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

        if (!input) return;

        const intervalId = setInterval(() => {
          if (!pressedKeys[key]) {
            clearInterval(intervalId);
            movementIntervals[key] = null;
          } else {
            sendPaddleInput(socket, gameId, input);
          }
        }, movementInterval);

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

        if (gameMode === 'local' && state.side) {
          payload.data.side = state.side;
        }

        socket.send(JSON.stringify(payload));
    }  

    const originalStdinListener = process.stdin._events.data;
    process.stdin.on('data', function keyupDetection(key) {
        setTimeout(() => {
          if (pressedKeys[key]) {
              handleKeyRelease(key);
          }
        }, 50); 
    });

    return function cleanup() {
        if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
        }
        process.stdin.pause();
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
  if (options.clear) {
    clearConfig();
    return;
  }

  const config = loadConfig();
  
  const token = options.token || config.token;
  if (!token) {
    console.error(chalk.red('Authentication token is required'));
    console.log('Use --token option to provide authentication');
    process.exit(1);
  }
  
  const gameId = options.game || config.gameId;
  if (!gameId) {
    console.error(chalk.red('Game ID is required'));
    console.log('Use --game option to specify the game ID');
    process.exit(1);
  }
  
  saveConfig(token, gameId);
  
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
    
    cleanupInput = setupKeyboardInput(socket, gameId);
  });
  
  socket.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type !== 'update') {
        console.log(chalk.yellow(`[${message.type}]`), 
          message.type === 'error' ? chalk.red(JSON.stringify(message.data, null, 2)) : '');
        
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
  
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\nExiting pong-cli'));
    if (cleanupInput) cleanupInput();
    socket.close();
    process.exit(0);
  });
}

startCli().catch(err => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});