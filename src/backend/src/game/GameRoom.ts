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
  
  /*------------------------------CONSTRUCTOR-------------------------------*/

  constructor(
    id: string,
    mode: 'local' | 'remote',
    private onCleanup: (gameId: string) => void,
    private tournamentId: string | null
  ) {
    this.id = id;
    this.mode = mode;
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
  // private async announceJoin(playerId: number, side: 'left' | 'right') {
  //   const db = await getDb();
  //   const user = await User.findById(db, Number(playerId));
    
  //   let playerName = user.username;
    
  //   if (this.tournamentId !== null) {
  //     try {
  //       const match = await db.get(
  //         `SELECT tournament_id FROM tournament_matches WHERE game_id = ?`,
  //         [this.id]
  //       );
        
  //       if (match) {
  //         const participant = await db.get(
  //           `SELECT alias FROM tournament_participants 
  //           WHERE tournament_id = ? AND user_id = ?`,
  //           [match.tournament_id, playerId]
  //         );
          
  //         if (participant && participant.alias) {
  //           playerName = participant.alias;
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error fetching tournament alias:", error);
  //     }
  //   }
    
  //   if (side === 'left') this.leftUserName = playerName;
  //   if (side === 'right') this.rightUserName = playerName;
    
  //   this.broadcast(JSON.stringify({
  //     type: 'player-joined',
  //     data: {
  //       message: `Player joined side: ${side}!`,
  //       side: side,
  //       ready: this.roomIsFull(),
  //       state: this.game.getState(),
  //       leftUserName: this.leftUserName,
  //       rightUserName: this.rightUserName
  //     }
  //   }));
  // }
  private async announceJoin(playerId: number, side: 'left' | 'right') {
    const db = await getDb();
    let playerName: string | null = null; // Default to null, will be set based on player data
    let guestPlayerName: string | null = null; // For local mode, if needed

    const hostParticipantId =  await db.get(
      `SELECT id FROM tournament_participants
        WHERE tournament_id = ? AND user_id = ? AND is_guest = 0`,
      [this.tournamentId, playerId]
    );

    const guestParticipantId = await db.get(
      `SELECT id FROM tournament_participants
        WHERE tournament_id = ? AND host_id = ? AND is_guest = 1`,
      [this.tournamentId, hostParticipantId]
    );

    console.log('hostParticipantId:', hostParticipantId);
    console.log('guestParticipantId:', guestParticipantId);

    try {
      if (this.tournamentId !== null) { // Handle Tournament Games
        const tmpPlayerName = await db.get(
            `SELECT alias FROM tournament_participants WHERE id = ? and tournament_id = ?`,
            [hostParticipantId, this.tournamentId] // Assuming playerId is the participant ID in this context
        );
        console.log('tmpPlayerName:', tmpPlayerName);
        playerName = tmpPlayerName != null ? tmpPlayerName : null;
        console.log('playerName:', playerName);
        if (this.mode === 'local') {
          const guestName = await db.get(
              `SELECT alias FROM tournament_participants WHERE host_id = ? and tournament_id = ?`,
              [guestParticipantId, this.tournamentId] // Assuming playerId is the participant ID in this context
          );
          console.log('guestName:', guestName);
          guestPlayerName = guestName != null ? guestName : null;
          console.log('guestPlayerName:', guestPlayerName);
        }
        if (!playerName) {
            console.warn(`Tournament Participant with ID ${playerId} not found. Using default player name.`);
        }
      } else { // Handle Non-Tournament (Regular) Games
        // In non-tournament games, playerId is typically the user_id directly
        const user = await User.findById(db, Number(playerId)); // Here, playerId is expected to be user_id

        if (user && user.username) {
          playerName = user.username;
        } else {
          console.warn(`User with ID ${playerId} not found or no username for non-tournament game. Using default player name.`);
          playerName = 'Player'; // Default for regular games
        }
      }
    } catch (error) {
        console.error("Error in announceJoin:", error);
        playerName = 'Error Player'; // Indicate an error occurred
    }

    if (side === 'left') this.leftUserName = playerName;
    if (side === 'right') this.rightUserName = playerName;
    if (this.tournamentId !== null && this.mode === 'local') this.rightUserName = guestPlayerName;

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

  // async recordResults(state: GameState) {
  //   const winScore = state.winner === 'left' ? state.scoreLeft : state.scoreRight;
  //   if (winScore !== 5) {
  //     console.log("Game ended before reaching a score of 5. Match result not recorded.");
  //     return;
  //   }

  //   const db = await getDb();
  //   const leftPlayerId = this.players.left?.id ?? null;
  //   const rightPlayerId = this.players.right?.id ?? null;
  //   const winnerId: number | null = state.winner === 'left' ? leftPlayerId : rightPlayerId;
  
  //   if ((leftPlayerId && rightPlayerId && winnerId) || (leftPlayerId && this.mode === 'local'))  {
  //     await this.recordMatch(db, leftPlayerId, rightPlayerId, winnerId, state);
  //     await this.recordPlayerResults(db, leftPlayerId, rightPlayerId, winnerId);
  //     await this.recordPlayerResults(db, rightPlayerId, leftPlayerId, winnerId);
  //     await updateTournamentMatchResult(this.id, winnerId!);
  //   }
  // }

  // async recordResults(state: GameState) {
  //   const winScore = state.winner === 'left' ? state.scoreLeft : state.scoreRight;
  //   if (winScore !== 5) {
  //     console.log("Game ended before reaching a score of 5. Match result not recorded.");
  //     return;
  //   }

  //   const db = await getDb();
  //   const leftPlayerId = this.players.left?.id ?? null;  
  //   const rightPlayerId = this.players.right?.id ?? null; 
  //   const winnerId: number | null = state.winner === 'left' ? leftPlayerId : rightPlayerId;
  
  //   // Ensure both players are present and a winner is determined for remote games (including tournament)
  //   // For local games, only leftPlayerId is needed as it's single player.
  //   if (!leftPlayerId || (this.mode === 'remote' && !rightPlayerId) || winnerId === null) {
  //       console.error("Game ended, but player IDs or winner ID could not be determined. Results not recorded.", this.id);
  //       return;
  //   }

  //   // Determine the type of game and delegate responsibility
  //   if (this.tournamentId !== null) {
  //       await updateTournamentMatchResult(this.id, winnerId, state, leftPlayerId, rightPlayerId);
  //   } else {
  //       // This is a regular (non-tournament) game
  //       if (this.mode === 'remote') {
  //           // For regular remote games, Player.id IS the user_id.
  //           // So, pass leftPlayerId, rightPlayerId, winnerId directly to GameStats functions.
  //           // We've already checked if both are present above.
  //           await this.recordMatch(db, leftPlayerId, rightPlayerId!, winnerId, state);
  //           await this.recordPlayerResults(db, leftPlayerId, rightPlayerId!, winnerId);
  //           await this.recordPlayerResults(db, rightPlayerId!, leftPlayerId, winnerId);
  //       } else if (this.mode === 'local') {
  //           // For local non-tournament games, we explicitly do NOT update Elo or record match history.
  //           console.log(`Local non-tournament game ${this.id} completed. Elo/Match History not updated.`);
  //       }
  //   }
  // }

  async recordResults(state: GameState) {
    const winScore = state.winner === 'left' ? state.scoreLeft : state.scoreRight;
    if (winScore !== 5) {
      console.log("Game ended before reaching a score of 5. Match result not recorded.");
      return;
    }

    const db = await getDb();
    const leftPlayerId = this.players.left?.id ?? null;  // Type: number | null
    const rightPlayerId = this.players.right?.id ?? null; // Type: number | null
    const winnerGameId: number | null = state.winner === 'left' ? leftPlayerId : rightPlayerId; // Type: number | null

    // Consolidate the check for required IDs based on game mode.
    // If this block is entered, we guarantee the necessary IDs are non-null.
    let essentialIdsMissing: boolean = false;
    if (this.mode === 'local') {
        if (leftPlayerId === null || winnerGameId === null) {
            essentialIdsMissing = true;
        }
    } else { // remote mode (which tournament games are)
        if (leftPlayerId === null || rightPlayerId === null || winnerGameId === null) {
            essentialIdsMissing = true;
        }
    }

    if (essentialIdsMissing) {
        console.error("Game ended, but essential player IDs or winner ID could not be determined. Results not recorded.", this.id);
        return;
    }

    // At this point, for the relevant mode, the necessary IDs are guaranteed to be 'number'.
    // We can use non-null assertions (!) to tell TypeScript this.

    if (this.tournamentId !== null) {
         // First, fetch the match details to get the tournament_id
        const matchDetails = await Tournament.findMatchByGameId(db, this.id);

        if (!matchDetails || matchDetails.tournament_id === null) {
            console.error(`Tournament match or its tournament ID not found in DB for game_id: ${this.id}. Cannot record tournament results.`);
            return;
        }

        const tournamentId = matchDetails.tournament_id;
        console.log(`Recording results for tournament ID: ${tournamentId}`);
        const leftParticipantIdForTour = await Tournament.getParticipantIdByUserIdAndTournamentId(db, tournamentId, leftPlayerId!);
        const rightParticipantIdForTour = await Tournament.getParticipantIdByUserIdAndTournamentId(db, tournamentId, rightPlayerId!);

        if (leftParticipantIdForTour === null || rightParticipantIdForTour === null) {
            console.error(`Could not map one or both user IDs (${leftPlayerId}, ${rightPlayerId}) to participant IDs for tournament ${tournamentId}. Cannot record tournament results.`);
            return;
        }

        // Determine the winner's participant ID for THIS tournament
        const winnerParticipantIdForTour: number = state.winner === 'left' ? leftParticipantIdForTour : rightParticipantIdForTour;

        await updateTournamentMatchResult(
            this.id,
            winnerParticipantIdForTour!, // winnerGameId is guaranteed non-null by essentialIdsMissing check
            state,
            leftParticipantIdForTour, // Use the fetched player1_participant_id
            rightParticipantIdForTour  // Use the fetched player2_participant_id
        );
    } else {
        // This is a regular (non-tournament) game
        if (this.mode === 'remote') {
            // For remote non-tournament games, leftPlayerId, rightPlayerId, and winnerGameId are guaranteed non-null.
            await this.recordMatch(db, leftPlayerId!, rightPlayerId!, winnerGameId!, state);
            await this.recordPlayerResults(db, leftPlayerId!, rightPlayerId!, winnerGameId!);
            await this.recordPlayerResults(db, rightPlayerId!, leftPlayerId!, winnerGameId!);
        } else if (this.mode === 'local') {
            // For local non-tournament games, we explicitly do NOT update Elo or record match history.
            console.log(`Local non-tournament game ${this.id} completed. Elo/Match History not updated.`);
        }
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
    return this.tournamentId !== null;
  }
}
