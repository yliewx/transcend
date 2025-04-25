import { PongGame, GameState } from './PongGame';
import { GameRoom } from './GameRoom';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

export class GameManager {
  private sessions: Map<string, GameRoom> = new Map(); // track active games
  private activePlayers: Map<number, GameRoom> = new Map(); // map player ID to game
  
  /*------------------------------CONSTRUCTOR-------------------------------*/

  constructor() {
    // Cleanup inactive sessions periodically (every hour)
    setInterval(() => {
      this.cleanupInactiveGames();
    }, 60 * 60 * 1000);
  }

  /*--------------------------------GET GAME--------------------------------*/

  // Search for game room by game ID
  public getRoom(gameId: string): GameRoom | undefined {
    console.log(`[GameManager] Fetching game with ID: ${gameId}`);
    console.log(`[GameManager] Current sessions: ${Array.from(this.sessions.keys())}`);
    return this.sessions.get(gameId);
  }

  // Search for game by player ID
  public getPlayerSession(playerId: number): { gameId: string, gameMode: string, isCreator: boolean } | undefined {
    console.log(`[GameManager] Fetching game with player ID: ${playerId}`);
    console.log(`[GameManager] Current player sessions:`);
    for (const [key, value] of this.activePlayers.entries()) {
      console.log(key, value);
    }
    
    const room = this.activePlayers.get(playerId);
    if (room) {
      return {
        gameId: room.getGameId(),
        gameMode: room.getGameMode(),
        isCreator: room.playerIsCreator(playerId)
      };
    }
    return undefined;
  }

  // // Get pong game instance directly
  // public getGame(gameId: string): PongGame | undefined {
  //   const room = this.getRoom(gameId);
  //   return room ? room.game : undefined;
  // }

  /*-------------------------------JOIN GAME--------------------------------*/

  public joinRoom(data: { gameId: string, playerId: number }, connection: WebSocket): boolean {
    const room = this.getRoom(data.gameId);
    if (room && room.handleJoin(data, connection)) {
      this.activePlayers.set(data.playerId, room);
      return true;
    }
    return false;
  }

  // public joinRoomByCLI(data: { gameId: string, playerId: number }, connection: WebSocket): boolean {

  // }

  /*------------------------------CREATE GAME-------------------------------*/

  public createGame(mode: 'local' | 'remote'): string {
    const gameId = uuidv4();
    console.log(`[GameManager] Creating game with ID: ${gameId}`);
    const room = new GameRoom(gameId, mode, this.deleteGame);
    this.sessions.set(gameId, room);
    return gameId;
  }

  /*------------------------------DESTROY GAME------------------------------*/

  public deleteGame(gameId: string): void {
    console.log(`[GameManager] Cleaning up game with ID: ${gameId}`);
    const room = this.sessions.get(gameId);
    if (room && room.game) {
      // Clean up resources & remove active players before deleting
      room.game.cleanup();
      const players = room.getPlayerIds();
      players.forEach(playerId => this.activePlayers.delete(playerId));
    }
    this.sessions.delete(gameId);
  }

  private cleanupInactiveGames(): void {
    const inactiveThreshold = 3 * 60 * 60 * 1000; // 3 hours
    const now = Date.now();
    
    this.sessions.forEach((room, gameId) => {
      const state = room.game.getState();
      
      if (now - state.lastUpdateTime > inactiveThreshold) {
        room.game.cleanup();
        const players = room.getPlayerIds();
        players.forEach(playerId => this.activePlayers.delete(playerId));

        this.sessions.delete(gameId);
      }
    });
  }
}

export const gameManager = new GameManager();