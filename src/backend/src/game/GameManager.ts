import { PongGame, GameState } from './PongGame';
import { GameRoom } from './GameRoom';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { sendError } from './ws.types';

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
    // console.log(`[GameManager] Current sessions: ${Array.from(this.sessions.keys())}`);
    return this.sessions.get(gameId);
  }

  // Search for game by player ID
  public getPlayerSession(playerId: number): { gameId: string, gameMode: string, state: GameState, isCreator: boolean } | undefined {
    console.log(`[GameManager] Fetching sessions with player ID: ${playerId}`);
    // console.log(`[GameManager] Current player sessions:`);
    for (const [key, value] of this.activePlayers.entries()) {
      console.log(key, value);
    }
    
    const room = this.activePlayers.get(playerId);
    if (room) {
      return {
        gameId: room.getGameId(),
        gameMode: room.getGameMode(),
        state: room.game.getState(),
        isCreator: room.playerIsCreator(playerId)
      };
    }
    return undefined;
  }

  /*------------------------------CREATE GAME-------------------------------*/

  public createGame(mode: 'local' | 'remote', isTour: boolean): string {
    const gameId = uuidv4();
    console.log(`[GameManager] Creating game with ID: ${gameId}`);
    const room = new GameRoom(gameId, mode, this.deleteGame.bind(this), isTour);
    this.sessions.set(gameId, room);
    return gameId;
  }

  /*-------------------------------JOIN GAME--------------------------------*/

  public joinRoom(data: { gameId: string, playerId: number }, connection: WebSocket): boolean {
    // Check if player is already in another game
    const existingGame = this.activePlayers.get(data.playerId);
    if (existingGame && existingGame.getGameId() !== data.gameId) {
      sendError(connection, 'Player cannot join more than one match at once');
      return false;
    }
    // Join game
    const room = this.getRoom(data.gameId);
    if (room && room.handleJoin(data, connection)) {
      this.activePlayers.set(data.playerId, room);
      return true;
    }
    return false;
  }

  private notifyCLISocket(room: GameRoom, cliSocket: WebSocket) {
    if (cliSocket.readyState === WebSocket.OPEN) {
      cliSocket.send(JSON.stringify({
        type: 'player-joined',
        data: {
          message: `Joined game!`,
          gameMode: room.getGameMode(),
          ready: room.roomIsFull(),
          state: room.game.getState()
        }
      }));
    }
  }

  // Check whether player has already joined via web
  public joinRoomByCLI(data: { gameId: string, playerId: number }, cliSocket: WebSocket): boolean {
    console.log('Joining room by CLI. Player ID:', data.playerId);
    const room = this.getRoom(data.gameId);
    if (room) {
      const players = room.getPlayerIds();
      console.log('Players:', players.toString());
      for (let existingPlayerId of players) {
        // If player joined via web, CLI socket should only be used to forward player input
        if (existingPlayerId === data.playerId) {
          console.log('Found existing player ID:', existingPlayerId);
          this.notifyCLISocket(room, cliSocket);
          return true;
        }
      };
    } else {
      console.log('Room not found.');
    }
    return false;
  }

  /*------------------------------DESTROY GAME------------------------------*/

  public deleteGame(gameId: string): void {
    if (!this.sessions || this.sessions.size === 0) {
      return;
    }
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