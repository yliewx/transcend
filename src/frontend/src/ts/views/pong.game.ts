import { Page } from '../types';
import { Router } from '../router';
import { GameState } from '../types';
import { PongGameService } from '../services/pong.game.service';

export class PongGamePage implements Page {
  private router: Router;
  private pongService: PongGameService;
  private element: HTMLElement | null = null;
  // For rendering game
  private ctx: CanvasRenderingContext2D | null = null;
  private gameWidth: number = 800;
  private gameHeight: number = 600;
  private paddleHeight: number = 100;
  private paddleWidth: number = 10;
  private ballSize: number = 30;
  // For handling game modes
  private gameMode: 'local' | 'remote' = 'remote';
  // Game data
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

  constructor(router: Router, pongService: PongGameService) {
    this.router = router;
    this.pongService = pongService;
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

  /*----------------------------RESET GAME STATE----------------------------*/

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

  /*-----------------------------EVENT HANDLERS-----------------------------*/

  private setupEventHandlers(): void {
    // Remove any existing event listeners first
    window.removeEventListener('keyup', this.keyUpHandler);
    window.removeEventListener('keydown', this.keyDownHandler);
    
    // Create new handlers based on the game type
    this.keyDownHandler = (e: KeyboardEvent) => {
      if (this.gameMode === 'remote') {
        // For remote play, only use arrow keys regardless of side
        if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          this.keysPressed[e.key] = true;
          console.log('Remote game - After keyDown, keysPressed:', {...this.keysPressed});
        }
      } else {
        // For local play, use both W/S and Arrow keys
        if (['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          this.keysPressed[e.key] = true;
          console.log('Local game - After keyDown, keysPressed:', {...this.keysPressed});
        }
      }
    };
    
    this.keyUpHandler = (e: KeyboardEvent) => {
      if (this.gameMode === 'remote') {
        // For remote play, only use arrow keys
        if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
          this.keysPressed[e.key] = false;
        }
      } else {
        // For local play, use both W/S and Arrow keys
        if (['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          this.keysPressed[e.key] = false;
        }
      }
    };
    
    // Add event listeners with the new key handlers
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

  /*---------------------------SETUP PONG CANVAS----------------------------*/

  private setupCanvas(): void {
    const canvas = this.element?.querySelector('#pong-canvas') as HTMLCanvasElement;
    this.ctx = canvas?.getContext('2d') || null;
    
    if (this.ctx) {
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
  }

  /*------------------------------CREATE GAME-------------------------------*/

  private async createGame(): Promise<void> {
    this.resetGame();

    const response = await this.pongService.createGame(this.gameMode);

    if (!response.success) {
      console.error('Server returned error:', response.error);
      return;
    }
    
    this.gameId = response.gameId!;
    
    const gameIdElement = this.element?.querySelector('#game-id');
    if (gameIdElement) gameIdElement.textContent = this.gameId;
    
    const gameControlsElement = this.element?.querySelector('#game-controls');
    if (gameControlsElement) gameControlsElement.classList.remove('hidden');
    
    this.updateGameStatusUI('Game created! Press Start to begin.');
  }

  /*------------------------------START GAME--------------------------------*/

  private async startGame(): Promise<void> {
    if (!this.gameId) {
      console.log("Cannot start game: gameId is null");
      return;
    }
    
    if (this.state && this.state.status !== 'waiting') {
      console.log("Cannot start game: game is already finished or already has been started");
      return;
    }
    
    console.log(`Starting game with ID: ${this.gameId}`);
    const response = await this.pongService.startGame(this.gameId);
    
    if (!response.success) {
      console.error('Server returned error:', response.error);
      return;
    }
    
    this.startGameLoop();
    this.updateGameStatusUI();
  }

  private startGameLoop(): void {
    this.stopGameLoop();

    const gameLoop = async () => {
      if (!this.gameId || this.state?.status === 'finished') 
        return;
    
      await this.pollGameState();

      this.gameLoopId = requestAnimationFrame(gameLoop);
    };

    this.gameLoopId = requestAnimationFrame(gameLoop);
  }

  /*------------------------------GAME STATE--------------------------------*/

  private async pollGameState(): Promise<void> {
    this.updateInputState();
    
    const requestBody = (this.inputChanged && (this.state?.status === 'playing' || this.state?.status === 'paused'))
      ? { input: this.inputState }
      : undefined;
    const url = `/games/${this.gameId}/poll${this.stateHash ? `?hash=${this.stateHash}` : ''}`;
    const response = await this.pongService.pollGameState(url,requestBody);

    if (!response.success) {
      console.error("Error polling game state");
      return;
    }
    
    if (!response.state) {
      return;  // This is a 304 response - the state hasn't changed, no action needed
    }

    const previousState = this.state;
    this.state = response.state;
    this.stateHash = response.hash || null;
    
    this.drawGame();
    
    // Handle game end
    if (previousState?.status === 'playing' && this.state?.status === 'finished') {
      this.recordMatchResult();
      this.stopGameLoop(); 
    }

    this.updateGameStatusUI();
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

  /*----------------------------=RECORD RESULT------------------------------*/

  private async recordMatchResult(): Promise<void> {
    if (!this.gameId || !this.state) return;
    
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
    const response = await this.pongService.recordMatchResult({
      gameId: this.gameId,
      userId: userId,
      // For simplicity, we'll assume the logged-in user is always the left player
      userSide: 'left',
      leftScore: this.state.scoreLeft,
      rightScore: this.state.scoreRight,
      winner: winner
    });
    
    if (!response.success) {
      console.error('Failed to record match:', response.error);
      return;
    }
    console.log('Match recorded successfully');
  }

  /*-------------------=-----------PAUSE GAME-------------------------------*/

  private async pauseGame(): Promise<void> {
    if (!this.gameId || !this.state) return;
  
    if (this.state.status === 'finished') {
      console.log("Cannot pause game: game is already finished");
      return;
    }
    
    const response = await this.pongService.pauseGame(this.gameId);
    
    if (!response.success) {
      console.error('Error pausing/resuming game:', response.error);
      return;
    }
    
    if (response.status) {
      this.state.status = response.status as GameState['status'];
      this.updateGameStatusUI();
    }
  }

  /*----------------------------UPDATE GAME UI------------------------------*/

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

  /*-------------------------------DRAW GAME--------------------------------*/

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

  /*------------------------------DESTROY GAME------------------------------*/

  public destroy(): void {
    console.log("Pong game destroy method called");

    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);

    this.resetGame();
    
    if (this.gameId) 
      this.pongService.cleanupGame(this.gameId);
  }
}