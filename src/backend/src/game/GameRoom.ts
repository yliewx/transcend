import { WebSocket } from 'ws';
import { GameState, PongGame } from "./PongGame";
import { InputMessage, sendError } from './ws.types';
import { getDb } from '../db';
import User from '../models/user';
import GameStats from '../models/game.stats';
import { Database } from 'sqlite';
import { updateTournamentMatchResult } from '../controllers/tour.controller';


export interface Player {
  id: number;
  socket: WebSocket | null;
}

export class GameRoom {
  private id: string;
  public game: PongGame;
  private mode: 'local' | 'remote';
  private localSocket: WebSocket | null = null;
  private players: {
    left: Player | null;
    right: Player | null;
  } = { left: null, right: null };
  private leftUserName: string | null = null;
  private rightUserName: string | null = null;
  private isTour: boolean = false; 
  /*------------------------------CONSTRUCTOR-------------------------------*/

  constructor(
    id: string,
    mode: 'local' | 'remote',
    private onCleanup: (gameId: string) => void,
    isTour: boolean
  ) {
    this.id = id;
    this.mode = mode;
    this.isTour = isTour;
    this.game = new PongGame(
      id,
      () => this.broadcastGameState('update'),
      (state: GameState) => this.endGame(state)
    );
  }

  /*--------------------------BROADCAST GAME STATE--------------------------*/

  private broadcast(message: any) {
    if (this.mode === 'local') {
      if (this.localSocket && this.localSocket.readyState === WebSocket.OPEN) {
        this.localSocket.send(message);
      }
      return;
    }
    if (this.players.left &&
      this.players.left?.socket?.readyState === WebSocket.OPEN) {
      this.players.left.socket.send(message);
    }
  
    if (this.players.right &&
      this.players.right?.socket?.readyState === WebSocket.OPEN) {
      this.players.right.socket.send(message);
    }
  }

  private broadcastGameState(type: 'update' | 'start') {
    const state = this.game.getState();
    const message = JSON.stringify({ type, data: state });
  
    this.broadcast(message);
  }

  /*------------------------------ANNOUNCE JOIN-----------------------------*/
  private async announceJoin(playerId: number, side: 'left' | 'right') {
    const db = await getDb();
    const user = await User.findById(db, Number(playerId));
    
    let playerName = user.username;
    
    if (this.isTour) {
      try {
        const match = await db.get(
          `SELECT tournament_id FROM tournament_matches WHERE game_id = ?`,
          [this.id]
        );
        
        if (match) {
          const participant = await db.get(
            `SELECT alias FROM tournament_participants 
            WHERE tournament_id = ? AND user_id = ?`,
            [match.tournament_id, playerId]
          );
          
          if (participant && participant.alias) {
            playerName = participant.alias;
          }
        }
      } catch (error) {
        console.error("Error fetching tournament alias:", error);
      }
    }
    
    if (side === 'left') this.leftUserName = playerName;
    if (side === 'right') this.rightUserName = playerName;
    
    this.broadcast(JSON.stringify({
      type: 'player-joined',
      data: {
        message: `Player joined side: ${side}!`,
        side: side,
        ready: this.roomIsFull(),
        state: this.game.getState(),
        leftUserName: this.leftUserName,
        rightUserName: this.rightUserName
      }
    }));
  }

  /*-------------------------------JOIN GAME--------------------------------*/

  private addNewPlayer(data: { gameId: string; playerId: number }, socket: WebSocket): boolean {
    console.log('Adding new player');
    if (this.mode === 'local') {
      if (this.localSocket) {
        sendError(socket, 'Local game already has a player.');
        socket.close();
        return false;
      }
      this.localSocket = socket;
      this.players.left = { id: data.playerId, socket };
      this.announceJoin(data.playerId, 'left');
    } else {
      if (!this.players.left) {
        this.players.left = { id: data.playerId, socket };
        this.announceJoin(data.playerId, 'left');
      } else if (!this.players.right) {
        this.players.right = { id: data.playerId, socket };
        this.announceJoin(data.playerId, 'right');
      } else {
        sendError(socket, 'Game is full');
        socket.close();
        return false;
      }
    }
    return true;
  }
 
  public handleJoin(data: { gameId: string; playerId: number }, socket: WebSocket): boolean {
    const { playerId } = data;

    const side = this.getPlayerSide(playerId);
  
    if (this.mode === 'local') {
      if (side === 'left' && this.players.left) {
        this.localSocket = socket;
        this.players.left.socket = socket;
        this.announceJoin(playerId, 'left');
      } else {
        const success = this.addNewPlayer(data, socket);
        if (!success) return false;
      }
    } else {
      if (side === 'left' && this.players.left) {
        console.log('Reconnecting left');
        this.players.left.socket = socket;
        this.announceJoin(playerId, 'left');
      } else if (side === 'right' && this.players.right) {
        console.log('Reconnecting right');
        this.players.right.socket = socket;
        this.announceJoin(playerId, 'right');
      } else {
        const success = this.addNewPlayer(data, socket);
        if (!success) return false;
      }
    }
  
    this.handlePlayerMessages(socket);
    return true;
  }

  /*-----------------------------MESSAGE HANDLER----------------------------*/

  private handlePlayerMessages(socket: WebSocket): void {
    socket.removeAllListeners('message');

    socket.on('message', (msg: any) => {
      const message = JSON.parse(msg.toString());
      console.log('[GameRoom] Full message:', message.type, JSON.stringify(message.data, null, 2));
    
      switch (message.type) {
        case 'input':
          this.handleInput(message.data, socket);
          break;
        case 'start':
          this.startGame(socket);
          break;
        case 'pause':
          this.pauseGame(socket);
          break;
        case 'reset':
          this.game.resetGame();
          break;
        default:
          sendError(socket, 'Unknown message type');
          break;
      }
    });    

    socket.on('close', () => {
      if (this.players.left && this.players.left?.socket === socket) {
        this.players.left.socket = null;
      } else if (this.players.right && this.players.right?.socket === socket) {
        this.players.right.socket = null;
      }
    });
  }

  /*------------------------------INPUT HANDLER-----------------------------*/

  private getPlayerSide(playerId: number): 'left' | 'right' | null {
    if (this.players.left?.id === playerId) return 'left';
    if (this.players.right?.id === playerId) return 'right';
    return null;
  }

  public handleInput(data: InputMessage, socket: WebSocket) {
    console.log('[GameRoom handleInput] Full data:', JSON.stringify(data, null, 2));
    let side;
    if (this.mode === 'local') {
      if (!data.side || (data.side !== 'left' && data.side !== 'right')) {
        sendError(socket, 'Missing player side in input.');
        return;
      }
      side = data.side;
    } else {
      side = this.getPlayerSide(data.playerId);
      if (!side) {
        sendError(socket, 'Unrecognized player.');
        return;
      }
    }
    this.game.updatePaddleInput(side, data.input);
    this.broadcastGameState('update');
  }

  /*-----------------------------STATE HANDLERS-----------------------------*/

  public roomIsFull(): boolean {
    return (
      (this.mode === 'local' && !!this.localSocket) ||
      (this.mode === 'remote' && !!this.players?.left && !!this.players?.right)
    );
  }

  public startGame(socket: WebSocket) {
    if (!this.roomIsFull()) {
      sendError(socket, 'Not enough players to start the game.');
      return;
    }
    if (this.game.getState().status !== 'waiting') return;
    this.game.startGame();
    this.broadcastGameState('start');
  }

  public pauseGame(socket: WebSocket) {
    const status = this.game.pauseGame();
    if (status === 'paused' || status === 'playing') {
      this.broadcastGameState('update');
    }
  }

  /*--------------------------------END GAME--------------------------------*/

  private endGame(state: GameState): void {
    this.broadcastGameState('update');
    this.recordResults(state);
    this.scheduleCleanup();
  }
  
  private scheduleCleanup(): void {
    setTimeout(() => {
      this.onCleanup(this.id);
    }, 1000);
  }

  /*---------------------------RECORD GAME RESULTS--------------------------*/

  async recordPlayerResults(db: Database,
    userId: number | null,
    opponentId: number | null,
    winnerId: number | null
  ) {
    let transactionStarted = true;
    try {
      await db.run('BEGIN TRANSACTION');
  
      const result: 'win' | 'loss' = winnerId === userId ? 'win' : 'loss';
      await GameStats.updateMatches(db, userId!, result);
      if (opponentId !== null) {
        await GameStats.updatePlayerElo(db, userId!, opponentId, winnerId === userId ? 1 : 0);
      }
      await GameStats.updateWinStreak(db, userId!, winnerId === userId);

      await db.run('COMMIT');
    } catch (error) {
      if (transactionStarted) {
        await db.run('ROLLBACK');
      }
      console.error('Error recording player results:', error);
      throw error;
    }
  }

  async recordMatch(db: Database,
    leftPlayerId: number,
    rightPlayerId: number | null,
    winnerId: number | null,
    state: GameState
  ): Promise<{ success: boolean; message: string }> {
    try {
      await GameStats.recordGameResult(db, leftPlayerId, rightPlayerId, winnerId, state.scoreLeft, state.scoreRight);
      
      return {
        success: true,
        message: 'Game result recorded successfully'
      };
    } catch (error) {
      console.error('Error recording game result:', error);
      throw error;
    }
  }

  async recordResults(state: GameState) {
    const winScore = state.winner === 'left' ? state.scoreLeft : state.scoreRight;
    if (winScore !== 5) {
      console.log("Game ended before reaching a score of 5. Match result not recorded.");
      return;
    }

    const db = await getDb();
    const leftPlayerId = this.players.left?.id ?? null;
    const rightPlayerId = this.players.right?.id ?? null;
    const winnerId: number | null = state.winner === 'left' ? leftPlayerId : rightPlayerId;
  
    if ((leftPlayerId && rightPlayerId && winnerId) || (leftPlayerId && this.mode === 'local'))  {
      await this.recordMatch(db, leftPlayerId, rightPlayerId, winnerId, state);
      await this.recordPlayerResults(db, leftPlayerId, rightPlayerId, winnerId);
      await this.recordPlayerResults(db, rightPlayerId, leftPlayerId, winnerId);
      await updateTournamentMatchResult(this.id, winnerId!);
    }
  }

  /*--------------------------------ACCESSORS-------------------------------*/

  public getGameId(): string {
    return this.id;
  }

  public getGameMode(): string {
    return this.mode;
  }

  public getPlayerIds(): number[] {
    const ids: number[] = [];
  
    if (this.players.left) ids.push(this.players.left.id);
    if (this.players.right) ids.push(this.players.right.id);
  
    return ids;
  }

  public playerIsCreator(playerId: number): boolean {
    if (this.players.left) {
      return playerId === this.players.left.id;
    }
    return false;
  }

  public isTourMatch(): boolean {
    return this.isTour;
  }
}
