import { WebSocket } from 'ws';
import { GameState, PongGame } from "./PongGame";
import { InputMessage, sendError } from './ws.types';
import { getDb } from '../db';
import User from '../models/user';
import GameStats from '../models/game.stats';
import { Database } from 'sqlite';
import { updateTournamentMatchResult } from '../controllers/tour.controller';
import Tournament from '../models/tournament';

export interface Player {
  userId: string | null;
  socket: WebSocket | null;
  participantId: number | null;
  alias: string | null;
}

export class GameRoom {
  public game: PongGame;
  private localSocket: WebSocket | null = null;
  private players: {
    left: Player | null;
    right: Player | null;
  } = { left: null, right: null };
  
  /*------------------------------CONSTRUCTOR-------------------------------*/

  constructor(
    private gameId: string,
    private mode: 'local' | 'remote',
    private onCleanup: (gameId: string) => void,
    private tourMatchId: number | null
  ) {
    this.game = new PongGame(
      gameId,
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
  
  private async announceJoin(playerId: string, side: 'left' | 'right') {
    this.broadcast(JSON.stringify({
        type: 'player-joined',
        data: {
          message: `Player joined side: ${side}!`,
          side: side,
          ready: this.roomIsFull(),
          state: this.game.getState(),
          leftUserName: this.players.left?.alias ?? null,
          rightUserName: this.players.right?.alias ?? null
        }
    }));
  }

  /*----------------------SET TOURNAMENT PLAYER DETAILS---------------------*/

  public async initTourPlayers(): Promise<boolean> {
    if (this.tourMatchId === null) {
      console.error('Match is not part of a tournament.');
      return false;
    }
    try {
      await this.setTourPlayerDetails();
    } catch (error) {
      console.error('Error in initTourPlayers:', error as Error);
      return false;
    }
    return true;
  }

  private async setTourPlayerDetails() {
    const db = await getDb();
    const participants = await Tournament.getMatchParticipants(db, this.tourMatchId!);
    if (!participants) {
      throw new Error(`Could not retrieve participant info for game_id=${this.gameId}, match_id=${this.tourMatchId}`);
    }

    const left = participants.find((p: any) => p.player === 'player1');
    const right = participants.find((p: any) => p.player === 'player2');
    if (!left) throw new Error(`Player 1 missing for game_id=${this.gameId}`);
    if (!right) throw new Error(`Player 2 missing for game_id=${this.gameId}`);

    this.players.left = {
      userId: left.user_id ?? null,
      participantId: left.participant_id ?? null,
      alias: left.alias ?? null,
      socket: null
    };
    if (left.is_guest && left.participant_id) {
      this.players.left.userId = await Tournament.getHostUserId(db, left.participant_id);
    }

    this.players.right = {
      userId: right.user_id ?? null,
      participantId: right.participant_id ?? null,
      alias: right.alias ?? null,
      socket: null
    };
    if (right.is_guest && right.participant_id) {
      this.players.right.userId = await Tournament.getHostUserId(db, right.participant_id);
    }
  }

  /*---------------------------SET PLAYER DETAILS---------------------------*/

  private async setPlayerDetails(
    side: 'left' | 'right',
    player: Partial<Player> & { userId: string; socket: WebSocket }
  ) {
    if (this.tourMatchId !== null) {
      return;
    }
    const db = await getDb();
    const user = await User.findById(db, player.userId);
    const alias = user?.username ?? 'Player';

    this.players[side] = {
      userId: player.userId,
      socket: player.socket,
      participantId: null,
      alias: alias ?? null,
    } as Player;
  }

  /*-------------------------------JOIN GAME--------------------------------*/

  private async addNewPlayer(data: { gameId: string; playerId: string }, socket: WebSocket): Promise<boolean> {
    if (this.mode === 'local') {
      if (this.tourMatchId !== null && data.playerId === this.players.left?.userId) {
        this.localSocket = socket;
        await this.setPlayerDetails('left', { userId: data.playerId, socket });
        this.announceJoin(data.playerId, 'left');
      }
      if (this.localSocket) {
        sendError(socket, 'Local game already has a player.');
        socket.close();
        console.log('[addNewPlayer] Local game already has a player:', this.players.left?.userId);
        return false;
      }
      this.localSocket = socket;
      await this.setPlayerDetails('left', { userId: data.playerId, socket });
      this.announceJoin(data.playerId, 'left');
    } else {
      if (!this.players.left) {
        await this.setPlayerDetails('left', { userId: data.playerId, socket });
        this.announceJoin(data.playerId, 'left');
      } else if (!this.players.right) {
        await this.setPlayerDetails('right', { userId: data.playerId, socket });
        this.announceJoin(data.playerId, 'right');
      } else {
        sendError(socket, 'Game is full');
        socket.close();
        return false;
      }
    }
    return true;
  }
 
  public async handleJoin(data: { gameId: string; playerId: string }, socket: WebSocket): Promise<boolean> {
    const { playerId } = data;

    const side = this.getPlayerSide(playerId);

    if (this.mode === 'local') {
      if (side === 'left' && this.players.left) {
        console.log('[GameRoom - handleJoin] Reconnecting local player');
        this.localSocket = socket;
        this.players.left.socket = socket;
        this.announceJoin(playerId, 'left');
      } else {
        const success = await this.addNewPlayer(data, socket);
        if (!success) return false;
      }
    } else {
      if (side === 'left' && this.players.left) {
        console.log('[GameRoom - handleJoin] Reconnecting left');
        this.players.left.socket = socket;
        this.announceJoin(playerId, 'left');
      } else if (side === 'right' && this.players.right) {
        console.log('[GameRoom - handleJoin] Reconnecting right');
        this.players.right.socket = socket;
        this.announceJoin(playerId, 'right');
      } else {
        console.log(`[GameRoom - handleJoin] Adding new player - side: ${side}, playerId: ${playerId}`);
        const success = await this.addNewPlayer(data, socket);
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

  private getPlayerSide(playerId: string): 'left' | 'right' | null {
    if (this.players.left?.userId === playerId) return 'left';
    if (this.players.right?.userId === playerId) return 'right';
    return null;
  }

  public handleInput(data: InputMessage, socket: WebSocket) {
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
      (this.mode === 'remote' && !!this.players?.left?.socket && !!this.players?.right?.socket)
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
      this.onCleanup(this.gameId);
    }, 1000);
  }

  /*---------------------------RECORD GAME RESULTS--------------------------*/

  async recordPlayerResults(db: Database,
    userId: string | null,
    opponentId: string | null,
    winnerId: string | null
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
      throw error;
    }
  }

  async recordMatch(db: Database,
    leftPlayerId: string,
    rightPlayerId: string | null,
    winnerId: string | null,
    state: GameState
  ): Promise<{ success: boolean; message: string }> {
    try {
      await GameStats.recordGameResult(db, leftPlayerId, rightPlayerId, winnerId, state.scoreLeft, state.scoreRight);
      
      return {
        success: true,
        message: 'Game result recorded successfully'
      };
    } catch (error) {
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
    const leftPlayerId = this.players.left?.userId ?? null;
    const rightPlayerId = this.players.right?.userId ?? null;
    const winnerGameId: string | null = state.winner === 'left' ? leftPlayerId : rightPlayerId;

    let essentialIdsMissing: boolean = false;
    if (this.mode === 'local') {
        if (leftPlayerId === null) {
            essentialIdsMissing = true;
        }
    } else {
        if (leftPlayerId === null || rightPlayerId === null || winnerGameId === null) {
            essentialIdsMissing = true;
        }
    }

    if (essentialIdsMissing) {
        console.error("Game ended, but essential player IDs or winner ID could not be determined. Results not recorded.", this.gameId);
        return;
    }

    if (this.tourMatchId !== null) {
        const leftParticipantId = this.players.left?.participantId ?? null;
        const rightParticipantId = this.players.right?.participantId ?? null;
        if (leftParticipantId === null || rightParticipantId === null) {
            console.error(`Could not map one or both user IDs (${leftPlayerId}, ${rightPlayerId}) to participant IDs for tournament ${this.tourMatchId}. Cannot record tournament results.`);
            return;
        }

        const winnerParticipantId: number = state.winner === 'left' ? leftParticipantId : rightParticipantId;

        await updateTournamentMatchResult(
            this.gameId,
            winnerParticipantId!,
            state,
            leftParticipantId,
            rightParticipantId
        );
    } else {
        if (this.mode === 'remote') {
            await this.recordMatch(db, leftPlayerId!, rightPlayerId!, winnerGameId!, state);
            await this.recordPlayerResults(db, leftPlayerId!, rightPlayerId!, winnerGameId!);
            await this.recordPlayerResults(db, rightPlayerId!, leftPlayerId!, winnerGameId!);
        } else if (this.mode === 'local') {
            console.log(`Local non-tournament game ${this.gameId} completed. Elo/Match History not updated.`);
        }
    }
  }

  /*--------------------------------ACCESSORS-------------------------------*/

  public getGameId(): string {
    return this.gameId;
  }

  public getGameMode(): string {
    return this.mode;
  }

  public getPlayerIds(): string[] {
    const ids: string[] = [];
  
    if (this.players.left?.userId != null) ids.push(this.players.left.userId);
    if (this.players.right?.userId != null) ids.push(this.players.right.userId);
  
    return ids;
  }

  public playerIsCreator(playerId: string): boolean {
    if (this.players.left) {
      return playerId === this.players.left.userId;
    }
    return false;
  }

  public isTourMatch(): boolean {
    return this.tourMatchId !== null;
  }
}
