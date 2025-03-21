// views/play/pong.game.ts
import { Page } from '../types';
import { Router } from '../router';

// Game state interface matching the server
interface GameState {
  id: string;
  paddleLeftY: number;
  paddleRightY: number;
  ballX: number;
  ballY: number;
  velocityX: number;
  velocityY: number;
  scoreLeft: number;
  scoreRight: number;
  gameWidth: number;
  gameHeight: number;
  paddleHeight: number;
  paddleWidth: number;
  ballSize: number;
  status: 'waiting' | 'playing' | 'paused' | 'finished';
  lastUpdateTime: number;
}

export class PongGamePage implements Page {
  private router: Router;
  private gameId: string | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private updateInterval: number | null = null;
  private currentState: GameState | null = null;
  private keyState: { [key: string]: boolean } = {};
  private stateHash: string | null = null; // For optimized polling
  private lastInputTime: { [key: string]: number } = {}; // For throttling input
  private inputThrottleMs = 50; // Send input at most every 50ms
  
  constructor(router: Router) {
    this.router = router;
  }
  
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';
    
    container.innerHTML = `
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow-md rounded-lg p-8">
          <div class="text-center mb-6">
            <h1 class="text-3xl font-bold text-gray-900">Pong Game</h1>
            <p class="mt-2 text-gray-600 mb-4">
              <strong>Controls:</strong> Player 1 (Left): W/S keys | Player 2 (Right): Arrow Up/Down keys
            </p>
            <p id="game-status" class="text-xl text-indigo-600 font-medium"></p>
          </div>
          
          <div class="flex justify-center mb-6">
            <button id="create-game-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded mx-2">
              Create New Game
            </button>
          </div>
          
          <div id="game-info" class="mb-4 text-center">
            <p>Game ID: <span id="game-id" class="font-mono">-</span></p>
          </div>
          
          <div id="game-controls" class="flex justify-center mb-6 hidden">
            <button id="start-game-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mx-2">
              Start
            </button>
            <button id="pause-game-btn" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded mx-2">
              Pause/Resume
            </button>
            <button id="reset-game-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mx-2">
              Reset
            </button>
          </div>
          
          <div class="flex justify-center">
            <canvas id="pong-canvas" width="800" height="600" class="border border-gray-300 rounded-lg shadow-lg bg-black"></canvas>
          </div>
          
          <div class="mt-6 text-center text-gray-500">
            <p>This is a server-side implementation of Pong. The game logic runs entirely on the server.</p>
          </div>
        </div>
      </div>
    `;
    
    // Setup event handlers after rendering
    setTimeout(() => this.setupEventHandlers(), 0);
    
    return container;
  }
  
  private setupEventHandlers(): void {
    // Set up the canvas
    this.canvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
    
    // Set up keyboard listeners
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Set up UI button listeners
    document.getElementById('create-game-btn')?.addEventListener('click', this.createGame.bind(this));
    document.getElementById('start-game-btn')?.addEventListener('click', this.startGame.bind(this));
    document.getElementById('pause-game-btn')?.addEventListener('click', this.pauseGame.bind(this));
    document.getElementById('reset-game-btn')?.addEventListener('click', this.resetGame.bind(this));
  }
  
  private async createGame(): Promise<void> {
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.gameId = data.gameId;
        // Fetch initial state
        await this.fetchGameState();
        this.startGameLoop();
        
        // Update UI
        this.updateGameStatus('Game created! Press Start to begin.');
        const gameIdElement = document.getElementById('game-id');
        if (gameIdElement) gameIdElement.textContent = this.gameId;
        
        const gameControlsElement = document.getElementById('game-controls');
        if (gameControlsElement) gameControlsElement.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Error creating game:', error);
    }
  }
  
  private async fetchGameState(): Promise<void> {
    if (!this.gameId) return;
    
    try {
      // Use the standard endpoint for initial fetch
      const response = await fetch(`/api/games/${this.gameId}`);
      
      const data = await response.json();
      
      if (data.success) {
        this.currentState = data.state;
        this.drawGame();
      }
    } catch (error) {
      console.error('Error getting game state:', error);
    }
  }
  
  private async pollGameState(): Promise<void> {
    if (!this.gameId) return;
    
    try {
      // Use optimized polling endpoint with hash for conditional update
      const url = `/api/games/${this.gameId}/poll${this.stateHash ? `?hash=${this.stateHash}` : ''}`;
      const response = await fetch(url);
      
      // If nothing changed (304 Not Modified), just return
      if (response.status === 304) {
        return;
      }
      
      if (!response.ok) {
        console.error('Error polling game state:', response.statusText);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.currentState = data.state;
        this.stateHash = data.hash;
        this.drawGame();
        
        // Add proper null check before accessing currentState properties
        if (this.currentState) {
          // Update UI based on game status
          if (this.currentState.status === 'playing') {
            this.updateGameStatus(`Playing: ${this.currentState.scoreLeft} - ${this.currentState.scoreRight}`);
          } else if (this.currentState.status === 'paused') {
            this.updateGameStatus('Game paused');
          } else if (this.currentState.status === 'waiting') {
            this.updateGameStatus('Waiting to start...');
          } else if (this.currentState.status === 'finished') {
            const winner = this.currentState.scoreLeft > this.currentState.scoreRight ? 'Left' : 'Right';
            this.updateGameStatus(`Game over! ${winner} player wins!`);
          }
        }
      }
    } catch (error) {
      console.error('Error polling game state:', error);
    }
  }
  
  private async movePaddle(side: 'left' | 'right', direction: 'up' | 'down'): Promise<void> {
    if (!this.gameId || this.currentState?.status !== 'playing') return;
    
    const now = Date.now();
    const inputKey = `${side}-${direction}`;
    
    // Throttle input to avoid overwhelming the server
    if (this.lastInputTime[inputKey] && now - this.lastInputTime[inputKey] < this.inputThrottleMs) {
      return;
    }
    
    this.lastInputTime[inputKey] = now;
    
    try {
      await fetch(`/api/games/${this.gameId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          side,
          direction
        })
      });
    } catch (error) {
      console.error('Error moving paddle:', error);
    }
  }
  
  private async startGame(): Promise<void> {
    if (!this.gameId) return;
    
    try {
      const response = await fetch(`/api/games/${this.gameId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.updateGameStatus('Game started!');
      }
    } catch (error) {
      console.error('Error starting game:', error);
    }
  }
  
  private async pauseGame(): Promise<void> {
    if (!this.gameId) return;
    
    try {
      const response = await fetch(`/api/games/${this.gameId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (this.currentState?.status === 'playing') {
          this.updateGameStatus('Game paused');
        } else {
          this.updateGameStatus('Game resumed');
        }
      }
    } catch (error) {
      console.error('Error pausing/resuming game:', error);
    }
  }
  
  private async resetGame(): Promise<void> {
    if (!this.gameId) return;
    
    try {
      const response = await fetch(`/api/games/${this.gameId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.updateGameStatus('Game reset! Press Start to begin again.');
        // Reset hash to force a full state update
        this.stateHash = null;
      }
    } catch (error) {
      console.error('Error resetting game:', error);
    }
  }
  
  private startGameLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Separate input handling and state polling
    // Process inputs on key events, not in the game loop
    
    // Poll for game state updates at a reasonable rate (20fps)
    this.updateInterval = window.setInterval(() => {
      this.pollGameState();
    }, 50); // 50ms = 20 updates per second
    
    // Start continuous input checking separate from state updates
    this.checkInputs();
  }
  
  private checkInputs(): void {
    // Use requestAnimationFrame for smooth input checking
    // This separates input handling from network polling
    const processInputs = () => {
      if (this.currentState?.status === 'playing') {
        // Player 1 controls (W/S keys)
        if (this.keyState['w'] || this.keyState['W']) {
          this.movePaddle('left', 'up');
        } else if (this.keyState['s'] || this.keyState['S']) {
          this.movePaddle('left', 'down');
        }
        
        // Player 2 controls (Arrow Up/Down keys)
        if (this.keyState['ArrowUp']) {
          this.movePaddle('right', 'up');
        } else if (this.keyState['ArrowDown']) {
          this.movePaddle('right', 'down');
        }
      }
      
      // Continue the loop
      requestAnimationFrame(processInputs);
    };
    
    // Start the input processing loop
    requestAnimationFrame(processInputs);
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    this.keyState[event.key] = true;
    
    // Prevent default behavior for the game control keys
    if (['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
    }
  }
  
  private handleKeyUp(event: KeyboardEvent): void {
    this.keyState[event.key] = false;
  }
  
  private drawGame(): void {
    if (!this.currentState || !this.ctx || !this.canvas) return;
    
    const { 
      gameWidth, gameHeight, paddleLeftY, paddleRightY, 
      paddleWidth, paddleHeight, ballX, ballY, ballSize,
      scoreLeft, scoreRight, status
    } = this.currentState;
    
    // Make sure canvas dimensions match the game state
    this.canvas.width = gameWidth;
    this.canvas.height = gameHeight;
    
    // Clear the canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, gameWidth, gameHeight);
    
    // Draw the center line
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.setLineDash([5, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(gameWidth / 2, 0);
    this.ctx.lineTo(gameWidth / 2, gameHeight);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    // Draw the paddles
    this.ctx.fillStyle = '#FFFFFF';
    
    // Left paddle
    this.ctx.fillRect(0, paddleLeftY, paddleWidth, paddleHeight);
    
    // Right paddle
    this.ctx.fillRect(gameWidth - paddleWidth, paddleRightY, paddleWidth, paddleHeight);
    
    // Draw the ball
    this.ctx.beginPath();
    this.ctx.arc(ballX, ballY, ballSize / 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw the scores
    this.ctx.font = '32px Arial';
    this.ctx.textAlign = 'center';
    
    // Left player score
    this.ctx.fillText(scoreLeft.toString(), gameWidth / 4, 50);
    
    // Right player score
    this.ctx.fillText(scoreRight.toString(), (gameWidth / 4) * 3, 50);
    
    // If game is paused, show a message
    if (status === 'paused') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, 0, gameWidth, gameHeight);
      
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('PAUSED', gameWidth / 2, gameHeight / 2);
    }
    
    // If game is waiting to start, show a message
    if (status === 'waiting') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, 0, gameWidth, gameHeight);
      
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '32px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Press Start to begin', gameWidth / 2, gameHeight / 2);
    }
  }
  
  private updateGameStatus(message: string): void {
    const statusElement = document.getElementById('game-status');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }
  
  // Clean up resources when component is destroyed
  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Also clean up the game on the server if needed
    if (this.gameId) {
      fetch(`/api/games/${this.gameId}`, {
        method: 'DELETE'
      }).catch(error => {
        console.error('Error cleaning up game:', error);
      });
    }
  }
}