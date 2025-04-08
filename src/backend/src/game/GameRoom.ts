import { WebSocket } from 'ws';
import { PongGame } from "./PongGame";
import { InputMessage } from './routes/ws.routes';
import { sendError } from './message.types';

export interface Player {
  id: string;
  socket: WebSocket;
}

export class GameRoom {
  private id: string;
  public game: PongGame;
  private mode: 'local' | 'remote';
  // Local play: only 1 socket required
  private localSocket: WebSocket | null = null;
  // OR Remote play: each player has their own socket
  private players: {
    left: Player | null;
    right: Player | null;
  } = { left: null, right: null};
  private gameLoopInterval: NodeJS.Timeout;

  /*------------------------------CONSTRUCTOR-------------------------------*/

  constructor(id: string, mode: 'local' | 'remote') {
    this.id = id;
    this.mode = mode;
    this.game = new PongGame(id);
    // Set up the game to notify GameRoom when the game ends
    this.game.onGameEnd((winner) => {
      this.endGame(winner);
    });

    this.gameLoopInterval = setInterval(() => {
      this.broadcastGameState();
    }, 1000 / 60);
  }

  /*--------------------------BROADCAST GAME STATE--------------------------*/

  // Broadcast message to players in room
  private broadcast(message: any) {
    // Local: Only need to send once
    if (this.mode === 'local') {
      // Check if socket is open before sending message
      if (this.localSocket && this.localSocket.readyState === WebSocket.OPEN) {
        this.localSocket.send(message);
      }
      return;
    }
    // Remote: Send to both players
    if (this.players.left &&
      this.players.left?.socket.readyState === WebSocket.OPEN) {
      this.players.left.socket.send(message);
    }
  
    if (this.players.right &&
      this.players.right?.socket.readyState === WebSocket.OPEN) {
      this.players.right.socket.send(message);
    }
  }

  private broadcastGameState() {
    const state = this.game.getState();
    const message = JSON.stringify({ type: 'state', data: state });
  
    this.broadcast(message);
  }

  // Notify players that just joined
  private assignSide(socket: WebSocket, side: 'left' | 'right' | 'both') {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify({ type: 'side', side }));
    }
  }

  /*-------------------------------JOIN GAME--------------------------------*/

  public addPlayer(data: { gameId: string; playerId: string }, socket: WebSocket) {
    if (this.mode === 'local') {
      // Local: Only one socket
      if (this.localSocket) {
        sendError(socket, 'Local game already has a player.');
        socket.close();
        return false;
      }
      this.localSocket = socket;
      this.players.left = { id: `${data.playerId}_L`, socket };
      this.players.right = { id: `${data.playerId}_R`, socket };
      this.assignSide(socket, 'both');
    } else {
      // Remote: Assign player side depending on availability
      if (!this.players.left) {
        this.players.left = { id: data.playerId, socket };
        this.assignSide(socket, 'left');
      } else if (!this.players.right) {
        this.players.right = { id: data.playerId, socket };
        this.assignSide(socket, 'right');
      } else {
        sendError(socket, 'Game is full');
        socket.close();
        return;
      }
    }

    // Message handler
    socket.on('message', (msg: any) => {
      const data = JSON.parse(msg.toString());
    
      switch (data.type) {
        case 'input':
          this.handleInput(data, socket);
          break;
        case 'start':
          this.startGame(socket);
          break;
        case 'pause':
          this.pauseGame(socket);
          break;
        default:
          sendError(socket, 'Unknown message type');
          break;
      }
    });    

    socket.on('close', () => {
      if (this.players.left?.socket === socket) {
        this.players.left = null;
      } else if (this.players.right?.socket === socket) {
        this.players.right = null;
      }
    });
  }

  /*----------------------------INPUT HANDLER-------------------------------*/

  private getPlayerSide(playerId: string): 'left' | 'right' | null {
    if (this.players.left?.id === playerId) return 'left';
    if (this.players.right?.id === playerId) return 'right';
    return null;
  }

  /*
  InputMessage {
    type: 'input';
    gameId: string;
    playerId: string;
    side?: 'left' | 'right'; // local play only
    input: {
      paddleUp: boolean;
      paddleDown: boolean;
    };
  }; */
  private handleInput(data: InputMessage, socket: WebSocket) {
    let side;
    if (this.mode === 'local') {
      // Local: Player side must be included in input message
      if (!data.side || (data.side !== 'left' && data.side !== 'right')) {
        sendError(socket, 'Missing player side in input.');
        return;
      }
      side = data.side;
    } else {
      // Remote: Match socket to the player
      side = this.getPlayerSide(socket);
      if (!side) {
        sendError(socket, 'Unrecognized player.');
        return;
      }
    }
    this.game.updatePaddleInput(side, data.input);
  }

  /*-----------------------------STATE HANDLERS-----------------------------*/

  private startGame(socket: WebSocket) {
    if (!this.isFull()) {
      sendError(socket, 'Game requires 2 players to start.');
      return;
    }
    // Start pong game and notify players
    this.game.startGame();
    this.broadcast(JSON.stringify({ type: 'game-start' }));
  }

  private pauseGame(socket: WebSocket) {
    const status = this.game.pauseGame();
    if (status === 'paused') {
      this.broadcast(JSON.stringify({ type: 'game-start' }));
    } else if (status === 'playing') {
      this.broadcast(JSON.stringify({ type: 'game-resume' }));
    }
  }

  // End the game and broadcast results
  public endGame(winner: 'left' | 'right'): void {
    this.broadcast(JSON.stringify({ type: 'game-end', winner }));
  }

  public isFull() {
    // Check if both players are present
    return this.players.left && this.players.right;
  }
}
