import { PongGame, GameState } from './PongGame';
import { v4 as uuidv4 } from 'uuid';

export class GameManager {
  private games: Map<string, PongGame> = new Map();
  
  constructor() {
    // Cleanup inactive games periodically (every hour)
    setInterval(() => {
      this.cleanupInactiveGames();
    }, 60 * 60 * 1000);
  }

  public getGame(gameId: string): PongGame | undefined {
    console.log(`Fetching game with ID: ${gameId}`);
    console.log(`Current games: ${Array.from(this.games.keys())}`);
    return this.games.get(gameId);
  }

  public createGame(): string {
    const gameId = uuidv4();
    console.log(`Creating game with ID: ${gameId}`);
    const game = new PongGame(gameId);
    this.games.set(gameId, game);
    return gameId;
  }

  public startGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;
    
    game.startGame();
    return true;
  }

  public pauseGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;
    
    game.pauseGame();
    return true;
  }
  
  public deleteGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (game) {
      game.cleanup(); // Clean up resources before deleting
    }
    return this.games.delete(gameId);
  }

  private cleanupInactiveGames(): void {
    const inactiveThreshold = 3 * 60 * 60 * 1000; // 3 hours
    const now = Date.now();
    
    this.games.forEach((game, gameId) => {
      const state = game.getState();
      
      if (now - state.lastUpdateTime > inactiveThreshold) {
        this.games.delete(gameId);
      }
    });
  }

  public updatePaddleInput(gameId: string, input: {
    leftPaddleUp: boolean;
    leftPaddleDown: boolean;
    rightPaddleUp: boolean;
    rightPaddleDown: boolean;
  }): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;
    
    game.updatePaddleInput(input);
    return true;
  }
}

export const gameManager = new GameManager();