export interface GameState {
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
    winner?: 'left' | 'right';
  }
  
  export class PongGame {
    private state: GameState;
    private updateInterval: NodeJS.Timeout | null = null;

    
    constructor(gameId: string) {
      this.state = {
        id: gameId,
        paddleLeftY: 250,
        paddleRightY: 250,
        ballX: 400,
        ballY: 300,
        velocityX: 5,
        velocityY: 3,
        scoreLeft: 0,
        scoreRight: 0,
        gameWidth: 800,
        gameHeight: 600,
        paddleHeight: 100,
        paddleWidth: 10,
        ballSize: 30,
        status: 'waiting',
        lastUpdateTime: Date.now(),
        winner: undefined 
      };
    }
  
    public startGame(): void {
      this.state.status = 'playing';
      this.resetBall();
      
      // Start a dedicated update loop for this game
      if (!this.updateInterval) {
        console.log(`Starting game loop for game ${this.state.id}`);
        this.updateInterval = setInterval(() => {
          if (this.state.status === 'playing') {
            this.updateState(16); // ~60fps
          }
        }, 16);
      }
    }
  
    public pauseGame(): void {
      if (this.state.status === 'playing') {
        this.state.status = 'paused';
      } else if (this.state.status === 'paused') {
        this.state.status = 'playing';
      }
    }
  
    public updateState(delta: number): void {

      console.log('Updating game state', this.state.id, 'delta:', delta);
      if (this.state.status !== 'playing') {
        console.log('Game not playing, status:', this.state.status);
        return;
      }

      // Update ball position
      this.state.ballX += this.state.velocityX;
      this.state.ballY += this.state.velocityY;

      // Ball collision with top and bottom walls
      if (this.state.ballY <= 0 || this.state.ballY >= this.state.gameHeight - this.state.ballSize) {
        this.state.velocityY = -this.state.velocityY;
      }
  
      // Ball collision with paddles
      // Left paddle
      if (
        this.state.ballX <= this.state.paddleWidth &&
        this.state.ballY + this.state.ballSize >= this.state.paddleLeftY &&
        this.state.ballY <= this.state.paddleLeftY + this.state.paddleHeight
      ) {
        this.state.velocityX = Math.abs(this.state.velocityX); // Ensure positive (moving right)
        
        // Add slight angle based on where the ball hits the paddle
        const paddleCenter = this.state.paddleLeftY + (this.state.paddleHeight / 2);
        const ballRelativePosition = (this.state.ballY - this.state.paddleLeftY) / this.state.paddleHeight;
        this.state.velocityY = (ballRelativePosition - 0.5) * 10; // -5 to +5 based on position
      }
  
      // Right paddle
      if (
        this.state.ballX >= this.state.gameWidth - this.state.paddleWidth - this.state.ballSize &&
        this.state.ballY + this.state.ballSize >= this.state.paddleRightY &&
        this.state.ballY <= this.state.paddleRightY + this.state.paddleHeight
      ) {
        this.state.velocityX = -Math.abs(this.state.velocityX); // Ensure negative (moving left)
        
        // Add slight angle based on where the ball hits the paddle
        const paddleCenter = this.state.paddleRightY + (this.state.paddleHeight / 2);
        const ballRelativePosition = (this.state.ballY - this.state.paddleRightY) / this.state.paddleHeight;
        this.state.velocityY = (ballRelativePosition - 0.5) * 10; // -5 to +5 based on position
      }
  
     // Scoring
      if (this.state.ballX < 0) {
        // Right player scores
        this.state.scoreRight += 1;
        
        // Check if right player won
        if (this.state.scoreRight >= 5) {
          this.endGame('right');
        } else {
          this.resetBall('left');
        }
      } else if (this.state.ballX > this.state.gameWidth) {
        // Left player scores
        this.state.scoreLeft += 1;
        
        // Check if left player won
        if (this.state.scoreLeft >= 5) {
          this.endGame('left');
        } else {
          this.resetBall('right');
        }
      }
    
      this.state.lastUpdateTime = Date.now();
    }
  
    public movePaddle(side: 'left' | 'right', direction: 'up' | 'down'): void {
      const moveAmount = 40;
      
      if (side === 'left') {
        if (direction === 'up') {
          this.state.paddleLeftY = Math.max(0, this.state.paddleLeftY - moveAmount);
        } else {
          this.state.paddleLeftY = Math.min(this.state.gameHeight - this.state.paddleHeight, this.state.paddleLeftY + moveAmount);
        }
      } else {
        if (direction === 'up') {
          this.state.paddleRightY = Math.max(0, this.state.paddleRightY - moveAmount);
        } else {
          this.state.paddleRightY = Math.min(this.state.gameHeight - this.state.paddleHeight, this.state.paddleRightY + moveAmount);
        }
      }
    }
  
    public getState(): GameState {
      return { ...this.state };
    }
  
    private resetBall(direction: 'left' | 'right' | 'random' = 'random'): void {
        this.state.ballX = this.state.gameWidth / 2;
        this.state.ballY = this.state.gameHeight / 2;
        
        const speed = 3;
        
        if (direction === 'random') {
            this.state.velocityX = speed * (Math.random() > 0.5 ? 1 : -1);
        } else if (direction === 'left') {
            this.state.velocityX = -speed;
        } else {
            this.state.velocityX = speed;
        }
        
        this.state.velocityY = (Math.random() * 2 - 1) * 5;
    }
  
    public resetGame(): void {
      this.state.scoreLeft = 0;
      this.state.scoreRight = 0;
      this.state.paddleLeftY = 250;
      this.state.paddleRightY = 250;
      this.resetBall();
      this.state.status = 'waiting';
    }

    public endGame(winner: 'left' | 'right'): void {
      this.state.status = 'finished';
      this.state.winner = winner;
      
      // Stop the game loop when the game is finished
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    }

    public cleanup(): void {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    }
  }