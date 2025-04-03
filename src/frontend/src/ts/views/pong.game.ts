import { Page } from '../types';
import { Router } from '../router';


interface GameState {
    id: string;
    status: 'waiting' | 'playing' | 'paused' | 'finished';
    paddleLeftY: number;
    paddleRightY: number;
    ballX: number;
    ballY: number;
    scoreLeft: number;
    scoreRight: number;
    winner?: 'left' | 'right';
    lastUpdateTime: number;
}

export class PongGamePage implements Page {
  private router: Router;
  private element: HTMLElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private gameWidth: number = 800;
  private gameHeight: number = 600;
  private paddleHeight: number = 100;
  private paddleWidth: number = 10;
  private ballSize: number = 30;
  private gameId: string | null = null;
  private state: GameState | null = null;
  private gameLoopId: number | null = null;
  private inputState = {
    leftPaddleUp: false,
    leftPaddleDown: false,
    rightPaddleUp: false,
    rightPaddleDown: false
  };
  private lastInputStateJson: string | null = null;
  private inputChanged = false;
  private stateHash: string | null = null;
  private keysPressed: { [key: string]: boolean } = {};

  private keyDownHandler = (e: KeyboardEvent) => {
    console.log('Key down event:', e.key);
    this.handleKeyDown(e);
  };

  private keyUpHandler = (e: KeyboardEvent) => {
    console.log('Key up event:', e.key);
    this.handleKeyUp(e);
  };

  constructor(router: Router) {
    this.router = router;
  }
  
  render(): HTMLElement {
    // Return cached element if it exists
    if (this.element) {
      return this.element;
    }
    
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
    
    setTimeout(() => {
        this.setupEventHandlers();
        this.setupCanvas();
     }, 0);
    
    // Cache the element
    this.element = container;
    
    return container;
  }

  update(): void {
    // Reset the game state when revisiting the page
    this.resetGame();
  }
  
  private resetGame(): void {
    // Clear any existing game state and intervals
    this.stopGameLoop();
    // Reset game state
    this.state = null;
    // Reset UI elements
    if (this.element) {
      const gameIdElement = this.element.querySelector('#game-id');
      const gameControlsElement = this.element.querySelector('#game-controls');
      const gameStatusElement = this.element.querySelector('#game-status');
      
      if (gameIdElement) gameIdElement.textContent = '-';
      if (gameControlsElement) gameControlsElement.classList.add('hidden');
      if (gameStatusElement) gameStatusElement.textContent = '';
      
      // Re-setup canvas
      this.setupCanvas();
    }
  }

  private setupEventHandlers(): void {
    window.addEventListener('keyup', this.keyUpHandler);
    window.addEventListener('keydown', this.keyDownHandler);
    
    const buttonActions = {
        'create-game-btn': () => this.createGame(),
        'start-game-btn': () => this.startGame(),
        'pause-game-btn': () => this.pauseGame()
      };
      
    Object.entries(buttonActions).forEach(([id, handler]) => {
        document.getElementById(id)?.addEventListener('click', () => {
          console.log(`${id} clicked`);
          handler(); 
        });
      });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        this.keysPressed[e.key] = true;
        console.log('After keyDown, keysPressed:', {...this.keysPressed}); // Spread to get a copy
    }
}
  
  private handleKeyUp(e: KeyboardEvent): void {
    if (['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        this.keysPressed[e.key] = false;
    }
  }

  private setupCanvas(): void {
    const canvas = this.element?.querySelector('#pong-canvas') as HTMLCanvasElement;
    this.ctx = canvas?.getContext('2d') || null;
    
    if (this.ctx) {
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
  }


  private async createGame(): Promise<void> {
    this.resetGame();

    try {
      const response = await fetch('/api/createGame', {
        method: 'POST',
        headers: {}
      });
  
      console.log('createGame response received:', response.status);
  
      if (!response.ok) {
        console.error('Server returned error status:', response.status);
        return;
      }
    
      const data = await response.json();
      
      if (data.success) {
        this.gameId = data.gameId;

        const gameIdElement = this.element?.querySelector('#game-id');
        if (gameIdElement) gameIdElement.textContent = this.gameId;
        const gameControlsElement = this.element?.querySelector('#game-controls');
        if (gameControlsElement) gameControlsElement.classList.remove('hidden');
       
        this.updateGameStatusUI('Game created! Press Start to begin.');
      }
    } catch (error) {
      console.error('Error creating game:', error);
    }
  }

  private async startGame(): Promise<void> {
    if (!this.gameId) {
      console.log("Cannot start game: gameId is null");
      return;
    }
    
    if (this.state && this.state.status !== 'waiting') {
      console.log("Cannot start game: game is already finished or already has been started");
      return;
    }
    
    try {
      console.log(`Starting game with ID: ${this.gameId}`);
      const response = await fetch(`/api/games/${this.gameId}/start`, {
        method: 'POST',
        headers: {}
      });

      console.log('startGame response received:', response.status);
      
      if (!response.ok) {
        console.error('Server returned error status:', response.status);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.startGameLoop();
        this.updateGameStatusUI();
      } else {
        console.error('Start game failed:', data);
      }
    } catch (error) {
      console.error('Error starting game:', error);
    }
  }


  private startGameLoop(): void {
    this.stopGameLoop();

    const gameLoop = async () => {
      if (!this.gameId || this.state?.status === 'finished') 
        return;
      
      try {
        await this.pollGameState();
      } catch (error) {
        console.error('Error updating game:', error);
        return;
      }

      this.gameLoopId = requestAnimationFrame(gameLoop);
    };

    this.gameLoopId = requestAnimationFrame(gameLoop);
  }

  
  private async pollGameState(): Promise<void> {
    this.updateInputState();
    
    const url = `/api/games/${this.gameId}/poll${this.stateHash ? `?hash=${this.stateHash}` : ''}`;

    const requestBody = {
      input: (this.inputChanged && (this.state?.status === 'playing' || this.state?.status === 'paused')) 
        ? this.inputState 
        : undefined
    };
  
    try {
      const response = await fetch(url, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    
      if (response.status === 304) {
        return;
      }
  
      if (!response.ok) {
        console.error('Error updating game state:', response.statusText);
        return;
      }
  
      const data = await response.json();
      if (!data.success || !data.state) 
      {
        console.log("Game state not found or not successful");
        return;
      }  
      
      const previousState = this.state;
      this.state = data.state;
      this.stateHash = data.hash;
      
      this.drawGame();
      
      // Handle game end
      if (previousState?.status === 'playing' && this.state?.status === 'finished') {
        this.recordMatchResult();
        this.stopGameLoop(); 
      }
      
      this.updateGameStatusUI();
    } catch (error) {
      console.error('Error polling game state:', error);
    }
  }

  private updateInputState(): void {
    this.inputState.leftPaddleUp = this.keysPressed['w'] || this.keysPressed['W'] || false;
    this.inputState.leftPaddleDown = this.keysPressed['s'] || this.keysPressed['S'] || false;
    this.inputState.rightPaddleUp = this.keysPressed['ArrowUp'] || false;
    this.inputState.rightPaddleDown = this.keysPressed['ArrowDown'] || false;
    
    const currentInputStateJson = JSON.stringify(this.inputState);
    this.inputChanged = this.lastInputStateJson === null || currentInputStateJson !== this.lastInputStateJson;
    this.lastInputStateJson = this.inputChanged ? currentInputStateJson : this.lastInputStateJson;
  }
  
  private stopGameLoop(): void {
    if (this.gameLoopId !== null) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
  }

  private async recordMatchResult(): Promise<void> {
    if (!this.gameId || !this.state) return;
    
    try {
      // Get user ID from session storage
      const userIdString = sessionStorage.getItem('userId');
      const userId: number | null = userIdString ? parseInt(userIdString, 10) : null;
      
      if (!userId) {
        console.log('User not logged in, not recording match');
        return;
      }
      
      // Determine which side won
      const winner = this.state.winner;
      
      // Call the API to record the match
      const response = await fetch('/api/games/record-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameId: this.gameId,
          userId: userId,
          // For simplicity, we'll assume the logged-in user is always the left player
          // You could add a player side selection UI in the future
          userSide: 'left',
          leftScore: this.state.scoreLeft,
          rightScore: this.state.scoreRight,
          winner: winner
        })
      });
      
      if (!response.ok) {
        console.error('Failed to record match:', response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('Match recorded successfully:', data);
      
    } catch (error) {
      console.error('Error recording match:', error);
    }
  }


  private async pauseGame(): Promise<void> {
    if (!this.gameId || !this.state) return;
  
    if (this.state.status === 'finished') {
      console.log("Cannot pause game: game is already finished");
      return;
    }
    
    try {
      const response = await fetch(`/api/games/${this.gameId}/pause`, {
        method: 'POST',
        headers: {}        
      });
      
      if (!response.ok) {
        console.error('Error pausing/resuming game:', response.statusText);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        this.state.status = data.status;
        this.updateGameStatusUI();
      }
    } catch (error) {
      console.error('Error pausing/resuming game:', error);
    }
  }

  private updateGameStatusUI(statusMessage?: string): void {
    if (!this.state) return;
    const statusElement = this.element?.querySelector('#game-status');
    if (!statusElement) return;
    
    if (statusMessage) {
      statusElement.textContent= statusMessage; 
    } else if (this.state.status === 'waiting') {
      statusElement.textContent= 'Game created! Press Start to begin.'; 
    } else if (this.state.status === 'playing') {
      statusElement.textContent= `Playing: ${this.state.scoreLeft} - ${this.state.scoreRight}`;
    } else if (this.state.status === 'paused') {
      statusElement.textContent= 'Game paused';
    } else if (this.state.status === 'finished') {
      const winner = this.state.winner === 'left' ? 'Left' : 'Right';
      const winningScore = this.state.winner === 'left' ? this.state.scoreLeft : this.state.scoreRight;
      const losingScore = this.state.winner === 'left' ? this.state.scoreRight : this.state.scoreLeft;
      statusElement.textContent= `Game over! ${winner} player wins ${winningScore}-${losingScore}!`;
    }
  }

  private drawGame(): void {
    if (!this.state || !this.ctx) return;
    
    // Clear the canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
    
    if (this.state.status === 'paused' || this.state.status === 'waiting' || this.state.status === 'finished') {
      // Add semi-transparent overlay
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.textAlign = 'center';

      if (this.state.status === 'waiting') { 
        this.ctx.font = '32px Arial';
        this.ctx.fillText('Press Start to begin', this.gameWidth / 2, this.gameHeight / 2);
      } else if (this.state.status === 'paused') {
        this.ctx.font = '48px Arial';
        this.ctx.fillText('PAUSED', this.gameWidth / 2, this.gameHeight / 2);
      } else {
        this.ctx.fillText(`${this.state.winner} player wins!`, this.gameWidth / 2, this.gameHeight / 2 - 30);
        this.ctx.font = '32px Arial';
        this.ctx.fillText(`Final Score: ${Math.max(this.state.scoreLeft, this.state.scoreRight)}-${Math.min(this.state.scoreLeft, this.state.scoreRight)}`, this.gameWidth / 2, this.gameHeight / 2 + 30);
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Click "Create New Game" to play again', this.gameWidth / 2, this.gameHeight / 2 + 90);
      }
      return;
    }
   
    this.drawCenterLine();
    this.drawPaddles();
    this.drawBall();
    this.drawScores(); 
  }
  
  private drawCenterLine(): void {
    if (!this.ctx) return;
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.setLineDash([5, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.gameWidth / 2, 0);
    this.ctx.lineTo(this.gameWidth / 2, this.gameHeight);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }
  
  private drawPaddles(): void {
    if (!this.ctx || !this.state) return;
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, this.state.paddleLeftY, this.paddleWidth, this.paddleHeight);
    this.ctx.fillRect(this.gameWidth - this.paddleWidth, this.state.paddleRightY, this.paddleWidth, this.paddleHeight);
  }
  
  private drawBall(): void {
    if (!this.ctx || !this.state) return;
    this.ctx.beginPath();
    this.ctx.fillStyle = "pink";
    this.ctx.arc(this.state.ballX, this.state.ballY, this.ballSize / 2, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  private drawScores(): void {
    if (!this.ctx || !this.state) return;
    this.ctx.font = '32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(this.state.scoreLeft.toString(), this.gameWidth / 4, 50);
    this.ctx.fillText(this.state.scoreRight.toString(), (this.gameWidth / 4) * 3, 50);
  }

  public destroy(): void {
    console.log("Pong game destroy method called");

    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);

    this.resetGame();
    
    // Clean up the game on the server if needed
    if (this.gameId) {
      fetch(`/api/games/${this.gameId}`, {
        method: 'DELETE'
      }).catch(error => {
        console.error('Error cleaning up game:', error);
      });
    }
  }
}