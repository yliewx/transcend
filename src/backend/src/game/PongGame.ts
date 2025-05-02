export interface GameState {
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

export class PongGame {
  private gameWidth: number = 800;
  private gameHeight: number = 600;
  private paddleHeight: number = 100;
  private paddleWidth: number = 10;
  private ballSize: number = 30;
  private ballSpeedX: number = 5;
  private ballSpeedY: number = 3;
  private paddleLeftSpeed: number = 5;
  private paddleRightSpeed: number = 5;
  private leftPaddleUp: boolean = false;
  private leftPaddleDown: boolean = false;  
  private rightPaddleUp: boolean = false;
  private rightPaddleDown: boolean = false;

  private state: GameState;
  private updateInterval: NodeJS.Timeout | null = null;

  /*------------------------------CONSTRUCTOR-------------------------------*/

  constructor(
    gameId: string,
    private updateCallback: () => void,
    private endgameCallback: (state: GameState) => void
  ) {
      this.state = {
        id: gameId,
        status: 'waiting',
        paddleLeftY: 250,
        paddleRightY: 250,
        ballX: 400,
        ballY: 300,
        scoreLeft: 0,
        scoreRight: 0,
        winner: undefined,
        lastUpdateTime: Date.now()
      };
  }

  /*------------------------------START GAME--------------------------------*/

  public startGame(): void {
    if (this.state.status !== 'waiting' )
      return;
    
    this.state.status = 'playing';

    if (this.updateInterval !== null)
      clearInterval(this.updateInterval);

    this.updateInterval = setInterval(() => {
      if (this.state.status === 'playing') {
        this.moveBall(); 
        this.movePaddles();
        this.state.lastUpdateTime = Date.now();        
        this.updateCallback();
      }
    }, 16);   
  }

  /*------------------------------GAME STATE--------------------------------*/

  private moveBall(): void {
    this.state.ballX += this.ballSpeedX;
    this.state.ballY += this.ballSpeedY;
    
    if (
      this.state.ballX <= this.paddleWidth &&
      this.state.ballY + this.ballSize >= this.state.paddleLeftY &&
      this.state.ballY <= this.state.paddleLeftY + this.paddleHeight
    ) {
        this.ballSpeedX = Math.abs(this.ballSpeedX);
        return;
    }

    if (
      this.state.ballX >= this.gameWidth - this.paddleWidth - this.ballSize &&
      this.state.ballY + this.ballSize >= this.state.paddleRightY &&
      this.state.ballY <= this.state.paddleRightY + this.paddleHeight
    ) {
        this.ballSpeedX = -Math.abs(this.ballSpeedX);
        return;
    }

    if (this.state.ballY <= 0 || this.state.ballY >= this.gameHeight - this.ballSize) 
        this.ballSpeedY = -this.ballSpeedY;

    if (this.state.ballX <= 0 || this.state.ballX >= this.gameWidth) {
        const rightScored = this.state.ballX <= 0;
        rightScored ? this.state.scoreRight++ : this.state.scoreLeft++;
        
        const score = rightScored ? this.state.scoreRight : this.state.scoreLeft;
        const scoringSide = rightScored ? 'right' : 'left' as 'right' | 'left';
        
        if (score >= 5) {
          this.endGame(scoringSide);
        } else {
          this.resetBall();
        }
    }
  }

  public updatePaddleInput(side: string, input: {
    paddleUp: boolean;
    paddleDown: boolean;
  }): void {
    if (this.state.status !== 'playing' && this.state.status !== 'paused') return;

    if (side === 'left') {
      this.leftPaddleUp = input.paddleUp;
      this.leftPaddleDown = input.paddleDown;
    } else {
      this.rightPaddleUp = input.paddleUp;
      this.rightPaddleDown = input.paddleDown;
    }
  }

  private movePaddles(): void {
    if (this.leftPaddleUp && !this.leftPaddleDown) {
      this.paddleLeftSpeed = Math.max(this.paddleLeftSpeed - 1, -10);
    } else if (this.leftPaddleDown && !this.leftPaddleUp) {
      this.paddleLeftSpeed = Math.min(this.paddleLeftSpeed + 1, 10);
    } else {
      this.paddleLeftSpeed = this.paddleLeftSpeed > 0 
        ? Math.max(this.paddleLeftSpeed - 1, 0) 
        : Math.min(this.paddleLeftSpeed + 1, 0);
    }
    
    if (this.rightPaddleUp && !this.rightPaddleDown) {
      this.paddleRightSpeed = Math.max(this.paddleRightSpeed - 1, -10);
    } else if (this.rightPaddleDown && !this.rightPaddleUp) {
      this.paddleRightSpeed = Math.min(this.paddleRightSpeed + 1, 10);
    } else {
      this.paddleRightSpeed = this.paddleRightSpeed > 0 
        ? Math.max(this.paddleRightSpeed - 1, 0) 
        : Math.min(this.paddleRightSpeed + 1, 0);
    }
    
    this.state.paddleLeftY += this.paddleLeftSpeed;
    this.state.paddleRightY += this.paddleRightSpeed;
    this.state.paddleLeftY = Math.max(0, Math.min(this.state.paddleLeftY, this.gameHeight - this.paddleHeight));
    this.state.paddleRightY = Math.max(0, Math.min(this.state.paddleRightY, this.gameHeight - this.paddleHeight));
  }

  private resetBall(): void {
      this.state.ballX = this.gameWidth / 2 - this.ballSize / 2;
      this.state.ballY = this.gameHeight / 2 - this.ballSize / 2;
      this.ballSpeedX = Math.random() > 0.5 ? 3 : -3;
      this.ballSpeedY = Math.random() > 0.5 ? 5 : -5;
  }

  /*-------------------------------PAUSE GAME-------------------------------*/

  public pauseGame(): string {
    console.log(`[pauseGame] initial status: ${this.state.status}`);
      if (this.state.status === 'playing' || this.state.status === 'paused') {
        this.state.status = this.state.status === 'playing' ? 'paused' : 'playing';
      }
      console.log(`[pauseGame] after: ${this.state.status}`);
      return this.state.status;
  }

  /*--------------------------------END GAME--------------------------------*/

  public resetGame(): void {
    this.state.status = 'finished';
    this.state.winner = this.state.scoreLeft > this.state.scoreRight ? 'left' : 'right';
    this.cleanup();
    this.endgameCallback(this.getState());
  }

  private endGame(winner: 'left' | 'right'): void {
    this.state.status = 'finished';
    this.state.winner = winner;
    this.cleanup();
    this.endgameCallback(this.getState());
  }

  public cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  public getState(): GameState {
    return { ...this.state };
  }
}