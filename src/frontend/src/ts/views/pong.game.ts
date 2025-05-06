import { Page } from '../types';
import { Router } from '../router';
import { GameState } from '../types';
import { PongGameService } from '../services/pong.game.service';
import { WebSocketManager } from '../services/websocket.manager';
import { PongViewComponents } from '../components/pong.components';
import { Notifications } from '../components/notifications';

export class PongGamePage implements Page {
  private router: Router;
  private wss: WebSocketManager;
  private pongService: PongGameService;
  private pongViewComponents: PongViewComponents;
  private element: HTMLElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private gameWidth: number = 800;
  private gameHeight: number = 600;
  private paddleHeight: number = 100;
  private paddleWidth: number = 10;
  private ballSize: number = 30;
  private gameMode: 'local' | 'remote' = 'local';
  private gameId: string | null = null;
  private userId: number | null = null;
  private isCreator: boolean = false;
  private isTourMatch: boolean = false;
  private state: GameState | null = null;
  private gameLoopId: number | null = null;
  private buttonHandlers: Record<string, EventListener> = {};
  private keysPressed: { [key: string]: boolean } = {};

  private keyDownHandler = (e: KeyboardEvent) => {
    this.handleKeyDown(e);
  };

  private keyUpHandler = (e: KeyboardEvent) => {
    this.handleKeyUp(e);
  };

  private leftUserName: string | null = null;
  private rightUserName: string | null = null;
  /*------------------------------CONSTRUCTOR-------------------------------*/

  constructor(router: Router, pongService: PongGameService) {
    this.router = router;
    this.pongService = pongService;
    this.pongViewComponents = new PongViewComponents();

    const id = sessionStorage.getItem('userId');
    const parsed = id !== null ? parseInt(id, 10) : NaN;
    this.userId = Number.isNaN(parsed) ? null : parsed;
    
    this.wss = this.router.getWsManager();
    this.setupMessageHandlers();
  }

  /*-----------------------------RENDER ELEMENT-----------------------------*/

  render(): HTMLElement {
    if (this.element) {
      return this.element;
    }
    
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';
    container.innerHTML = this.pongViewComponents.render();

    setTimeout(() => {
        this.setupEventHandlers();
        this.setupCanvas();
     }, 0);
    
    this.element = container;
    
    return container;
  }

  /*----------------------------RESET GAME STATE----------------------------*/

  async update() {
    const reconnected = await this.restoreGameSession();
    if (!reconnected) {
      this.resetGame();
    }
  }
  
  private resetGame(): void {   
    this.stopGameLoop();
    this.state = null;
    this.isCreator = false;

    if (this.element) {
      const gameIdElement = this.element.querySelector('#game-id');
      if (gameIdElement) gameIdElement.textContent = '-';

      const gameStatusElement = this.element.querySelector('#game-status');
      if (gameStatusElement) gameStatusElement.textContent = '';

      this.element?.querySelector('#game-controls')?.classList.add('hidden');
      this.element?.querySelector('#join-game-btn')?.classList.remove('hidden');
      this.element?.querySelector('#reset-game-btn')?.classList.remove('hidden');
      this.element?.querySelector('#start-game-btn')?.classList.remove('hidden');
      this.hideJoinGameForm();
      this.element?.querySelector('#pong-canvas-container')?.classList.add('hidden');
      this.element?.querySelector('#mode-selection')?.classList.remove('hidden');
      this.element?.querySelector('#remote-key-controls')?.classList.add('hidden');
      this.element?.querySelector('#local-key-controls')?.classList.add('hidden');

      this.setupEventHandlers();
      this.setupCanvas();
    }
  }

  /*--------------------------MANAGE GAME SESSION---------------------------*/

  private async restoreGameSession(): Promise<boolean> {
    if (this.userId === null) {
      const id = sessionStorage.getItem('userId');
      const parsed = id !== null ? parseInt(id, 10) : NaN;
      this.userId = Number.isNaN(parsed) ? null : parsed;
      if (this.userId === null) {
        console.error('Cannot check for active game session. No user ID found.');
        return false;
      }
    }
  
    const response = await this.pongService.getExistingGame(this.userId!);
    if (response.hasExistingGame) {
      this.gameId = response.gameId ?? null;
      this.gameMode = response.gameMode ?? 'local';
      this.state = response.state ?? null;
      this.isCreator = response.isCreator ?? false;
      this.isTourMatch = response.isTourMatch ?? false;

      if (this.gameId && this.state?.status !== 'finished') {
        this.updateGameStatusUI('Reconnecting to previous game...');
        try {
          const success = await this.wss.connectGame(this.gameId, this.userId);
          if (success) {
            const gameIdElement = this.element?.querySelector('#game-id');
            if (gameIdElement) gameIdElement.textContent = this.gameId;
            this.updateGameStatusUI('Reconnected to game!');
            this.toggleDisplayedControls();
            if (this.state?.status === 'waiting') {
              this.element?.querySelector('#start-game-btn')?.classList.remove('hidden');
            } else {
              this.element?.querySelector('#start-game-btn')?.classList.add('hidden');
            }
            this.startGameLoop();
            return true;
          }
        } catch (error) {
          console.warn('Failed to reconnect to previous game.');
        }
      }
    }
    return false;
  }

  /*--------------------------GAME MESSAGE HANDLERS-------------------------*/

  private setupMessageHandlers(): void {
    this.wss.onGameEvent('start', (state: GameState) => this.handleStartGame(state));
    this.wss.onGameEvent('player-joined', (data: any) => this.handleJoinedGame(data));
    this.wss.onGameEvent('update', (state: GameState) => this.handleUpdateState(state));
  }

  private handleStartGame(state: GameState): void {    
    this.state = state;
    this.element?.querySelector('#start-game-btn')?.classList.add('hidden');
    this.startGameLoop();
    this.updateGameStatusUI();
  }

  private setupGameUI(): void {
    const gameIdElement = this.element?.querySelector('#game-id');
    if (gameIdElement) gameIdElement.textContent = this.gameId;
    this.element?.querySelector('#game-controls')?.classList.remove('hidden');
    this.element?.querySelector('#pong-canvas-container')?.classList.remove('hidden');
    this.element?.querySelector('#mode-selection')?.classList.add('hidden');
    if (this.isTourMatch) {
      this.element?.querySelector('#reset-game-btn')?.classList.add('hidden');
    }
    this.toggleDisplayedControls();
  }

  private toggleDisplayedControls(): void {
    if (this.gameMode === 'remote') {
      this.element?.querySelector('#local-key-controls')?.classList.add('hidden');
      this.element?.querySelector('#remote-key-controls')?.classList.remove('hidden');
    } else {
      this.element?.querySelector('#local-key-controls')?.classList.remove('hidden');
      this.element?.querySelector('#remote-key-controls')?.classList.add('hidden');
    }
  }

  private handleJoinedGame(data: any): void {
    if (data.state) this.state = data.state;
    if (data.leftUserName !== null) this.leftUserName = data.leftUserName;
    if (data.rightUserName !== null) this.rightUserName = data.rightUserName;

    this.setupGameUI();
    if (this.state?.status === 'playing') {
      this.setupEventHandlers();
      this.startGameLoop();
      this.updateGameStatusUI();
    } else if (this.isCreator && data.ready) {
      this.updateGameStatusUI('Game created! Press Start to begin.');
    } else if (this.isCreator && !data.ready) {
      this.updateGameStatusUI('Game created! Waiting for opponent to join.');
    } else {
      this.updateGameStatusUI('Joined game! Waiting for start.');
    }
  }

  private handleUpdateState(state: GameState): void {
    const prevState = this.state;
    this.state = state;
  
    if (prevState?.status === 'playing' && this.state.status === 'finished') {
      this.drawGame();
      this.stopGameLoop();
    }
    this.updateGameStatusUI();
  }

  /*-----------------------------EVENT HANDLERS-----------------------------*/
  private cleanResetGame(): void {
    if (!window.confirm('Are you sure you want to reset the game?\n \
      Your current result will not be saved.')) {
      return;
    }
  
    this.resetGame();
    this.wss.sendMessage('reset', {
      gameId: this.gameId,
      playerId: this.userId
    });
    this.wss.disconnectGame();
  }
  

  private setupEventHandlers(): void {
    window.removeEventListener('keyup', this.keyUpHandler);
    window.removeEventListener('keydown', this.keyDownHandler);
    
    this.keyDownHandler = this.handleKeyDown.bind(this);
    this.keyUpHandler = this.handleKeyUp.bind(this);
    
    window.addEventListener('keyup', this.keyUpHandler);
    window.addEventListener('keydown', this.keyDownHandler);
    
    const buttonActions: Record<string, () => void> = {
      'create-local-game-btn': () => this.createGame('local'),
      'create-remote-game-btn': () => this.createGame('remote'),
      'join-game-btn': () => this.showJoinGameForm(),
      'submit-join-game-btn': () => this.joinGame(),
      'cancel-join-game-btn': () => this.hideJoinGameForm(),
      'start-game-btn': () => this.startGame(),
      'pause-game-btn': () => this.pauseGame(),
      'reset-game-btn': () => this.cleanResetGame(),
      'cli-btn': () => this.showCLIToken()
    };

    Object.entries(buttonActions).forEach(([id, action]) => {
      const button = document.getElementById(id);
      if (!button) return;

      if (this.buttonHandlers[id]) {
        button.removeEventListener('click', this.buttonHandlers[id]);
      }

      const clickHandler = () => {
        action();
      };
      this.buttonHandlers[id] = clickHandler;
      button.addEventListener('click', clickHandler);
    });

    window.addEventListener('beforeunload', this.handleBeforeUnload);
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
          this.sendInput('right');
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
          this.sendInput('right');
        } else {
          this.sendInput(this.getPlayerSide(key));
        }
      }
    }
  }

  /*------------------------------CREATE GAME-------------------------------*/

  private async createGame(gameMode: 'local' | 'remote'): Promise<void> {
    this.resetGame();
    this.gameMode = gameMode;

    const joinGameFormElement = this.element?.querySelector('#join-game-form');
    if (joinGameFormElement) joinGameFormElement.classList.add('hidden');

    const response = await this.pongService.createGame(this.gameMode);
    if (!response.success) {
      console.error('Server returned error:', response.error);
      return;
    }
    
    this.gameId = response.gameId!;
    this.isCreator = true;
    try {
      await this.wss.connectGame(this.gameId, this.userId!);
    } catch (error) {
      console.warn('Failed to connect to game room.');
      Notifications.show('error', 'Failed to join game');
    }
  }
  
  /*------------------------------JOIN GAME---------------------------------*/

  private showJoinGameForm(): void {
    const joinGameFormElement = this.element?.querySelector('#join-game-form');
    if (joinGameFormElement) {
      joinGameFormElement.classList.remove('hidden');
      
      const inputElement = joinGameFormElement.querySelector('#game-invite-code') as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
      }
    }
  }

  private hideJoinGameForm(): void {
    const joinGameFormElement = this.element?.querySelector('#join-game-form');
    if (joinGameFormElement) {
      joinGameFormElement.classList.add('hidden');
      
      const inputElement = joinGameFormElement.querySelector('#game-invite-code') as HTMLInputElement;
      if (inputElement) {
        inputElement.value = '';
      }
    }
  }

  private async joinGame(): Promise<void> {
    const inputElement = this.element?.querySelector('#game-invite-code') as HTMLInputElement;
    if (!inputElement) return;
    
    const gameCode = inputElement.value.trim();
    if (!gameCode) {
      alert('Please enter a valid invite code');
      return;
    }
    if (gameCode.length > 50) {
      alert('Invite code cannot exceed 50 characters');
      inputElement.value = gameCode.substring(0, 50);
      return;
    }
    
    this.resetGame();
    this.gameId = gameCode;
    this.isCreator = false;
    try {
      await this.wss.connectGame(this.gameId, this.userId!);
    } catch (error) {
      console.warn('Failed to connect to game room.');
      Notifications.show('error', 'Failed to join game');
    }
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

    this.wss.sendMessage('start', {
      gameId: this.gameId,
      playerId: this.userId
    });
  }

  /*-------------------=-----------PAUSE GAME-------------------------------*/

  private async pauseGame(): Promise<void> {
    if (!this.gameId || !this.state) return;
  
    if (this.state.status === 'finished') {
      console.log("Cannot pause game: game is already finished");
      return;
    }

    this.wss.sendMessage('pause', {
      gameId: this.gameId,
      playerId: this.userId
    });
  }

  /*-------------------=-----------PAUSE GAME-------------------------------*/

  private async showCLIToken(): Promise<void> {
    const response = await this.pongService.generateCLIToken();
    if (!response.success) {
      console.error('Server returned error:', response.error);;
    }
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
      const winner = this.state.winner === 'left' ? this.leftUserName : this.rightUserName;
      const winningScore = this.state.winner === 'left' ? this.state.scoreLeft : this.state.scoreRight;
      const losingScore = this.state.winner === 'left' ? this.state.scoreRight : this.state.scoreLeft;
      if (winningScore === 5) {
        statusElement.textContent= `Game over! ${winner} wins ${winningScore}-${losingScore}!`;
      } else {
        statusElement.textContent= `Game over! Match was reset. Final score: ${this.state.scoreLeft}-${this.state.scoreRight}`;
      }
    }
  }

  /*-------------------------------DRAW GAME--------------------------------*/

  private drawGame(): void {
    if (!this.state || !this.ctx) return;
    
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
    
    if (this.state.status === 'paused' || this.state.status === 'waiting' || this.state.status === 'finished') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.textAlign = 'center';

      if (this.state.status === 'waiting') { 
        this.ctx.font = '32px Raleway, Arial, sans-serif';
        this.ctx.fillText('Press Start to begin', this.gameWidth / 2, this.gameHeight / 2);
      } else if (this.state.status === 'paused') {
        this.ctx.font = '48px Raleway, Arial, sans-serif';
        this.ctx.fillText('PAUSED', this.gameWidth / 2, this.gameHeight / 2);
      } else {
        this.ctx.fillText(`${this.state.winner} player wins!`, this.gameWidth / 2, this.gameHeight / 2 - 30);
        this.ctx.font = '32px Raleway, Arial, sans-serif';
        this.ctx.fillText(`Final Score: ${Math.max(this.state.scoreLeft, this.state.scoreRight)}-${Math.min(this.state.scoreLeft, this.state.scoreRight)}`, this.gameWidth / 2, this.gameHeight / 2 + 30);
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
    this.ctx.font = '32px Raleway, Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(this.state.scoreLeft.toString(), this.gameWidth / 4, 50);
    this.ctx.fillText(this.state.scoreRight.toString(), (this.gameWidth / 4) * 3, 50);
    const leftPlayerName = this.leftUserName || 'Guest';
    const rightPlayerName = this.rightUserName || 'Guest';
    this.ctx.font = '16px Raleway, Arial, sans-serif';
    this.ctx.fillText(leftPlayerName, this.gameWidth / 4, 80);
    this.ctx.fillText(rightPlayerName, (this.gameWidth / 4) * 3, 80);
  }

  /*------------------------------DESTROY GAME------------------------------*/

  public destroy(): void {  
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);    
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    
    Object.entries(this.buttonHandlers).forEach(([id, handler]) => {
      const button = document.getElementById(id);
      if (button) {
        button.removeEventListener('click', handler);
      }
    });
    
    this.buttonHandlers = {};
    this.stopGameLoop();
    this.wss.disconnectGame();
    
    this.element = null;
  }

  private handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (this.state?.status === 'playing') {
      event.preventDefault();
      event.returnValue = '';
    }
  };
}