import { PongGame, GameState } from './PongGame';
import { GameRoom } from './GameRoom';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { sendError } from './ws.types';
import chalk from 'chalk';

export class GameManager {
  private sessions: Map<string, GameRoom> = new Map();
  private activePlayers: Map<number, GameRoom> = new Map();
  
  /*------------------------------CONSTRUCTOR-------------------------------*/

  constructor() {
    setInterval(() => {
      this.cleanupInactiveGames();
    }, 60 * 60 * 1000);
  }

  /*--------------------------------GET GAME--------------------------------*/

  public getRoom(gameId: string): GameRoom | undefined {
    console.log(chalk.cyan.bold('\n[GameManager] Fetching game...'));
    console.log(chalk.cyan(`→ Game ID: ${chalk.whiteBright(gameId)}`));
    this.printSessions();

    return this.sessions.get(gameId);
  }

  public getPlayerSession(playerId: number): { gameId: string, gameMode: string, state: GameState, isCreator: boolean, isTourMatch: boolean } | undefined {
    console.log(chalk.magenta.bold('\n[GameManager] Fetching sessions for player...'));
    console.log(chalk.magenta(`→ Player ID: ${chalk.whiteBright(playerId)}`));
    this.printActivePlayers();
    
    const room = this.activePlayers.get(playerId);
    if (room) {
      return {
        gameId: room.getGameId(),
        gameMode: room.getGameMode(),
        state: room.game.getState(),
        isCreator: room.playerIsCreator(playerId),
        isTourMatch: room.isTourMatch()
      };
    }
    return undefined;
  }

  /*------------------------------CREATE GAME-------------------------------*/

  public createGame(mode: 'local' | 'remote', isTour: boolean): string {
    const gameId = uuidv4();
    console.log(chalk.cyan.bold('\n[GameManager] Creating game with ID: ') + chalk.cyan(gameId));
    const room = new GameRoom(gameId, mode, this.deleteGame.bind(this), isTour);
    this.sessions.set(gameId, room);
    return gameId;
  }

  /*-------------------------------JOIN GAME--------------------------------*/

  public joinRoom(data: { gameId: string, playerId: number }, connection: WebSocket): boolean {
    const existingGame = this.activePlayers.get(data.playerId);
    if (existingGame && existingGame.getGameId() !== data.gameId) {
      console.error('Player is already in a game');
      sendError(connection, 'Player cannot join more than one match at once');
      return false;
    }
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

  public joinRoomByCLI(data: { gameId: string, playerId: number }, cliSocket: WebSocket): boolean {
    console.log('Joining room by CLI. Player ID:', data.playerId);
    const room = this.getRoom(data.gameId);
    if (room) {
      const players = room.getPlayerIds();
      console.log('Players:', players.toString());
      for (let existingPlayerId of players) {
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
      room.game.cleanup();
      const players = room.getPlayerIds();
      players.forEach(playerId => this.activePlayers.delete(playerId));
    }
    this.sessions.delete(gameId);
  }

  private cleanupInactiveGames(): void {
    const inactiveThreshold = 3 * 60 * 60 * 1000;
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

  /*-------------------------------PRINT LOGS-------------------------------*/

  private printSessions(): void {
    console.log(chalk.cyan(`→ No. of active sessions: ${chalk.whiteBright(this.sessions.size)}\n`));

    for (const [key, value] of this.sessions.entries()) {
      console.log(chalk.blue.bold(`• Game Session:`));
      console.log(chalk.blue(`  - Game ID           : `) + chalk.whiteBright(`[${key}]`));
      console.log(chalk.blue(`  - Mode              : `) + chalk.whiteBright(value.getGameMode()));
      console.log(chalk.blue(`  - Tournament Match? : `) + chalk.whiteBright(value.isTourMatch().toString()));
      console.log();
    }
  }

  private printActivePlayers(): void {
    console.log(chalk.magenta(`→ No. of active players: ${chalk.whiteBright(this.activePlayers.size)}\n`));

    for (const [key, value] of this.activePlayers.entries()) {
      console.log(chalk.yellow.bold(`• Active Player:`));
      console.log(chalk.yellow(`  - Player ID         : `) + chalk.whiteBright(`[${key}]`));
      console.log(chalk.yellow(`  - Game ID           : `) + chalk.whiteBright(value.getGameId()));
      console.log(chalk.yellow(`  - Mode              : `) + chalk.whiteBright(value.getGameMode()));
      console.log(chalk.yellow(`  - Tournament Match? : `) + chalk.whiteBright(value.isTourMatch().toString()));
      console.log();
    }
  }
}

export const gameManager = new GameManager();