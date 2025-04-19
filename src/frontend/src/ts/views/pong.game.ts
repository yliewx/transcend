import { Page } from '../types';
import { Router } from '../router';
import { GameState } from '../types';
import { PongGameService } from '../services/pong.game.service';
import { WebSocketManager } from '../services/websocket.manager';

export class PongGamePage implements Page {
  private router: Router;
  private wss: WebSocketManager;
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
  private userId: number | null = null;
  private isCreator: boolean = false;
  private state: GameState | null = null;
  private gameLoopId: number | null = null;
  private buttonHandlers: Record<string, EventListener> = {};
  private keysPressed: { [key: string]: boolean } = {};

  private keyDownHandler = (e: KeyboardEvent) => {
    console.log('Key down event:', e.key);
    this.handleKeyDown(e);
  };

  private keyUpHandler = (e: KeyboardEvent) => {
    console.log('Key up event:', e.key);
    this.handleKeyUp(e);
  };

  /*------------------------------CONSTRUCTOR-------------------------------*/

  constructor(router: Router, pongService: PongGameService) {
    this.router = router;
    this.pongService = pongService;
    this.wss = this.router.getWsManager();
    this.setupMessageHandlers();

    // Get user ID from session storage
    const userIdString = sessionStorage.getItem('userId');
    this.userId = userIdString ? parseInt(userIdString, 10) : null;
  }

  /*-----------------------------RENDER ELEMENT-----------------------------*/

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
            <button id="join-game-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mx-2">
              Join Game
            </button>
          </div>
          
          <div id="join-game-form" class="mb-6 text-center hidden">
            <div class="flex justify-center items-center">
              <input 
                type="text" 
                id="game-invite-code" 
                placeholder="Enter invite code" 
                class="border rounded py-2 px-3 text-gray-700 focus:outline-none focus:shadow-outline w-64"
              />
              <button id="submit-join-game-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2">
                Join
              </button>
              <button id="cancel-join-game-btn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded ml-2">
                Cancel
              </button>
            </div>
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
    this.isCreator = false;
    // Reset UI elements
    if (this.element) {
      const gameIdElement = this.element.querySelector('#game-id');
      const gameControlsElement = this.element.querySelector('#game-controls');
      const gameStatusElement = this.element.querySelector('#game-status');
      const joinButton = this.element?.querySelector('#join-game-btn');
      
      if (gameIdElement) gameIdElement.textContent = '-';
      if (gameControlsElement) gameControlsElement.classList.add('hidden');
      if (gameStatusElement) gameStatusElement.textContent = '';
      if (joinButton) joinButton.classList.remove('hidden');

      
      // Re-setup canvas
      this.setupEventHandlers();
      this.setupCanvas();
    }
  }

  /*--------------------------GAME MESSAGE HANDLERS-------------------------*/

  // Set up handlers for receiving websocket messages
  private setupMessageHandlers(): void {
    this.wss.onGameEvent('start', (state: GameState) => this.handleStartGame(state));
    this.wss.onGameEvent('player-joined', (data: any) => this.handleJoinedGame(data));
    this.wss.onGameEvent('update', (state: GameState) => this.handleUpdateState(state));
  }

  // Called by websocket manager on 'start' message
  private handleStartGame(state: GameState): void {
    console.log('[handleStartGame] Starting game');
    this.state = state;
    this.startGameLoop();
    this.updateGameStatusUI();
  }

  // Called by websocket manager on 'player-joined' message
  private handleJoinedGame(data: any): void {
    if (data.state) this.state = data.state;

    // Update UI
    const gameIdElement = this.element?.querySelector('#game-id');
    if (gameIdElement) gameIdElement.textContent = this.gameId;
    
    const gameControlsElement = this.element?.querySelector('#game-controls');
    if (gameControlsElement) gameControlsElement.classList.remove('hidden');
    
    this.hideJoinGameForm();
    if (this.isCreator && data.ready) {
      this.updateGameStatusUI('Game created! Press Start to begin.');
    } else if (this.isCreator && !data.ready) {
      this.updateGameStatusUI('Game created! Waiting for opponent to join.');
    } else {
      this.updateGameStatusUI('Joined game! Waiting for start.');
    }
  }

  // Called by websocket manager on 'update' message
  private handleUpdateState(state: GameState): void {
    const prevState = this.state;
    this.state = state;
  
    // Handle game end
    if (prevState?.status === 'playing' && this.state.status === 'finished') {
      console.log('[handleUpdateState] Game has ended');
      this.drawGame();
      this.recordMatchResult();
      this.stopGameLoop();
    }
    this.updateGameStatusUI();
  }

  /*-----------------------------EVENT HANDLERS-----------------------------*/

  private setupEventHandlers(): void {
    // Remove any existing event listeners first
    window.removeEventListener('keyup', this.keyUpHandler);
    window.removeEventListener('keydown', this.keyDownHandler);
    
    // Create new handlers based on the game type
    this.keyDownHandler = this.handleKeyDown.bind(this);
    this.keyUpHandler = this.handleKeyUp.bind(this);
    
    // Add event listeners with the new key handlers
    window.addEventListener('keyup', this.keyUpHandler);
    window.addEventListener('keydown', this.keyDownHandler);
    
    // Add event listeners for the buttons
    const buttonActions: Record<string, () => void> = {
      'create-game-btn': () => this.createGame(),
      'join-game-btn': () => this.showJoinGameForm(),
      'submit-join-game-btn': () => this.joinGame(),
      'cancel-join-game-btn': () => this.hideJoinGameForm(),
      'start-game-btn': () => this.startGame(),
      'pause-game-btn': () => this.pauseGame()
    };

    Object.entries(buttonActions).forEach(([id, action]) => {
      const button = document.getElementById(id);
      if (!button) return;

      // If there's already a stored handler, remove it
      if (this.buttonHandlers[id]) {
        button.removeEventListener('click', this.buttonHandlers[id]);
      }

      // Create and store new handler
      const clickHandler = () => {
        console.log(`${id} clicked`);
        action();
      };
      this.buttonHandlers[id] = clickHandler;
      button.addEventListener('click', clickHandler);
    });
  }

  /*------------------------------KEY HANDLERS------------------------------*/

  private getPlayerSide(key: string): 'left' | 'right' {
    return ['ArrowUp', 'ArrowDown'].includes(key) ? 'right' : 'left';
  }
  
  private sendInput(side: 'left' | 'right'): void {
    if (side === 'left') {
      this.wss.sendInput({
        paddleUp: this.keysPressed['w'] || this.keysPressed['W'] || false,
        paddleDown: this.keysPressed['s'] || this.keysPressed['S'] || false
      }, 'left');
    } else {
      this.wss.sendInput({
        paddleUp: this.keysPressed['ArrowUp'] || false,
        paddleDown: this.keysPressed['ArrowDown'] || false
      }, 'right');
    }
  }
  
  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key;
    const isRemote = this.gameMode === 'remote';
    if (
      (isRemote && ['ArrowUp', 'ArrowDown'].includes(key)) ||
      (!isRemote && ['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(key))
    ) {
      e.preventDefault();
      if (!this.keysPressed[key]) {
        this.keysPressed[key] = true;
  
        if (isRemote) {
          this.sendInput('right'); // remote: server handles player side
        } else {
          this.sendInput(this.getPlayerSide(key));
        }
      }
    }
  }
  
  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key;
    const isRemote = this.gameMode === 'remote';
    if (
      (isRemote && ['ArrowUp', 'ArrowDown'].includes(key)) ||
      (!isRemote && ['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(key))
    ) {
      if (this.keysPressed[key]) {
        this.keysPressed[key] = false;
  
        if (isRemote) {
          this.sendInput('right'); // remote: server handles player side
        } else {
          this.sendInput(this.getPlayerSide(key));
        }
      }
    }
  }

  /*------------------------------CREATE GAME-------------------------------*/

  private async createGame(): Promise<void> {
    this.resetGame();

    // Hide join button + input field if "create game" is selected
    const joinButton = this.element?.querySelector('#join-game-btn');
    if (joinButton) joinButton.classList.add('hidden');

    const joinGameFormElement = this.element?.querySelector('#join-game-form');
    if (joinGameFormElement) joinGameFormElement.classList.add('hidden');

    // API call to create game
    const response = await this.pongService.createGame(this.gameMode);
    if (!response.success) {
      console.error('Server returned error:', response.error);
      return;
    }
    
    // Connect to game room with the ID returned by the server
    this.gameId = response.gameId!;
    this.isCreator = true;
    this.wss.connectGame(this.gameId, this.userId!);
  }

  /*------------------------------JOIN GAME---------------------------------*/

  // On join game button
  private showJoinGameForm(): void {
    const joinGameFormElement = this.element?.querySelector('#join-game-form');
    if (joinGameFormElement) {
      joinGameFormElement.classList.remove('hidden');
      
      // Focus the input field
      const inputElement = joinGameFormElement.querySelector('#game-invite-code') as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
      }
    }
  }

  // On submit or cancel button
  private hideJoinGameForm(): void {
    const joinGameFormElement = this.element?.querySelector('#join-game-form');
    if (joinGameFormElement) {
      joinGameFormElement.classList.add('hidden');
      
      // Clear the input field
      const inputElement = joinGameFormElement.querySelector('#game-invite-code') as HTMLInputElement;
      if (inputElement) {
        inputElement.value = '';
      }
    }
  }

  // On submit-join-game button
  private async joinGame(): Promise<void> {
    const inputElement = this.element?.querySelector('#game-invite-code') as HTMLInputElement;
    if (!inputElement) return;
    
    const gameCode = inputElement.value.trim();
    if (!gameCode) {
      alert('Please enter a valid invite code');
      return;
    }
    
    this.resetGame();
    this.gameId = gameCode;
    this.isCreator = false;
    this.wss.connectGame(gameCode, this.userId!);
    // handleJoinedGame() when the server responds
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

    if (!this.isCreator) {
      console.log('Cannot start game: Player who created the game must start!');
      return ;
    }

    // Notify server to start game
    console.log(`Messaging server to start game ID: ${this.gameId}`);
    this.wss.sendMessage('start', {
      gameId: this.gameId,
      playerId: this.userId
    });
    // handleStartGame() will start the game loop when the server responds
  }

  /*-------------------=-----------PAUSE GAME-------------------------------*/

  private async pauseGame(): Promise<void> {
    if (!this.gameId || !this.state) return;
  
    if (this.state.status === 'finished') {
      console.log("Cannot pause game: game is already finished");
      return;
    }

    console.log(`Messaging server to pause game ID: ${this.gameId}`);
    this.wss.sendMessage('pause', {
      gameId: this.gameId,
      playerId: this.userId
    });
  }

  /*------------------------------GAME STATE--------------------------------*/
  
  private startGameLoop(): void {
    this.stopGameLoop();

    const gameLoop = () => {
      if (!this.gameId || this.state?.status === 'finished') 
        return;

      this.drawGame();
      this.gameLoopId = requestAnimationFrame(gameLoop);
    };

    this.gameLoopId = requestAnimationFrame(gameLoop);
  }

  private stopGameLoop(): void {
    if (this.gameLoopId !== null) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
  }

  /*-----------------------------RECORD RESULT------------------------------*/

  private async recordMatchResult(): Promise<void> {
    if (!this.gameId || !this.state) return;
    
    // Get user ID from session storage
    if (!this.userId) {
      console.log('User not logged in, not recording match');
      return;
    }
    
 
    
    // Call the API to record the match
    const response = await this.pongService.recordMatchResult({
      gameId: this.gameId,
      userId: userId,
      opponentId: 2, //hardcoded for now
      winnerId: this.state.winner === 'left' ? userId : 2, //hardcoded for now
      leftScore: this.state.scoreLeft,
      rightScore: this.state.scoreRight,
    });
    
    if (!response.success) {
      console.error('Failed to record match:', response.error);
      return;
    }
    console.log('Match recorded successfully');
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