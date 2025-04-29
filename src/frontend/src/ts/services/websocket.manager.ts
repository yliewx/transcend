import { GameState } from "../types";

export class WebSocketManager {
  private baseUrl: string;
  private onlineSocket: WebSocket | null = null;
  private gameSocket: WebSocket | null = null;
  private gameId: string | null = null;
  private playerId: number | null = null;
  private gameEventCallbacks: Map<string, (data: any) => void> = new Map();
  private onUserEventCallbacks: Map<string, (data: any) => void> = new Map();
  // Handle reconnection
  private retryCount: number = 0;
  private maxRetryCount: number = 5;
  private isReconnecting: boolean = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Register handler functions from PongGamePage
  public onGameEvent(type: string, callback: (data: any) => void): void {
    this.gameEventCallbacks.set(type, callback);
  }

  // Register handler functions from FriendsPage
  public onUserEvent(type: string, callback: (data: any) => void): void {
    this.onUserEventCallbacks.set(type, callback);
  }

  /*------------------------------GAME SOCKET-------------------------------*/

  public async connectGame(gameId: string, userId: number): Promise<boolean> {
    if (this.gameSocket) {
      this.gameSocket.close();
    }
    this.gameId = gameId;
    this.playerId = userId;
    this.retryCount = 0;
  
    try {
      this.gameSocket = new WebSocket(`${this.baseUrl}/pong/${gameId}`);
      await this.waitForSocketOpen(this.gameSocket);
  
      console.log(`Connected to the game room: ${gameId}. Waiting to join game...`);
  
      const joinSuccess = await this.waitForJoin(this.gameSocket);
      if (!joinSuccess) {
        this.gameSocket.close();
        throw new Error('Failed to join game');
      }
  
      this.setupGameSocketHandlers();
      return true;
    } catch (err) {
      console.error("[Game Socket] Error:", err);
      this.gameSocket?.close();
      throw err;
    }
  }  
  
  private waitForSocketOpen(socket: WebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      socket.onopen = () => resolve();
      socket.onerror = (err) => reject(err);
      socket.onclose = () => reject(new Error('Socket closed before opening.'));
    });
  }
  
  private waitForJoin(socket: WebSocket): Promise<boolean> {
    return new Promise((resolve) => {
      // Set up initial message handler: only handle player-joined
      // Remove message handler after joining (or on error)
      const onMessage = (event: MessageEvent) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.error('Invalid JSON from server:', event.data);
          resolve(false);
          socket.removeEventListener('message', onMessage);
          return;
        }
  
        const { type, data } = message;

        switch (type) {
          case 'error':
            console.error('[Game Socket] Error from server:', JSON.stringify(data, null, 2));
            socket.removeEventListener('message', onMessage);
            resolve(false);
            break;
          case 'player-joined':
            const callback = this.gameEventCallbacks.get(type);
            if (callback) {
              callback(data);
            }
            console.log('[Game Socket] Successfully joined game.');
            socket.removeEventListener('message', onMessage);
            resolve(true);
            break;
          default:
            console.warn('[Game Socket] No handler registered for event type:', type);
            break
        }
      };
  
      socket.addEventListener('message', onMessage);
  
      // Send join message
      this.sendMessage('join', { gameId: this.gameId, playerId: this.playerId });
    });
  }

  // Set up actual game message handlers after joining
  private setupGameSocketHandlers(): void {
    if (!this.gameSocket) {
      console.error('[Game Socket] No active socket to set handlers on.');
      return;
    }
  
    this.gameSocket.onmessage = (event: MessageEvent) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        console.error('Received invalid JSON:', event.data);
        return;
      }
      this.handleGameMessages(message.type, message.data);
    };
  
    this.gameSocket.onclose = () => {
      console.warn('[Game Socket] Connection closed.');
      this.reconnectGame();
    };
  
    this.gameSocket.onerror = (err) => {
      console.error('[Game Socket] Socket error:', err);
    };
  }

  // Only call when reset game button is pressed
  public disconnectGame(): void {
    if (this.gameSocket) {
      // Prevent automatic reconnection attempts
      this.gameSocket.onclose = () => {
        console.log('[Game Socket] Connection closed during game reset.');
      };
      
      // Close the socket
      this.gameSocket.close();
      this.gameSocket = null;
    }
    
    // Clear game state
    this.gameId = null;
    this.retryCount = 0;
    this.isReconnecting = false;
  }

  private async reconnectGame(): Promise<boolean> {
    if (this.isReconnecting) return false;
    this.isReconnecting = true;
  
    if (!this.gameId || !this.playerId) {
      console.error("[Game Socket] Missing gameId or playerId.");
      this.isReconnecting = false;
      return false;
    }
  
    while (this.retryCount < this.maxRetryCount) {
      this.retryCount++;
      const delay = 1000 * Math.pow(2, this.retryCount);
  
      console.log(`[Game Socket] Reconnecting attempt ${this.retryCount} in ${delay}ms...`);
  
      await new Promise(res => setTimeout(res, delay));
  
      try {
        const success = await this.connectGame(this.gameId, this.playerId);
        if (success) {
          console.log("[Game Socket] Reconnected successfully!");
          this.isReconnecting = false;
          return true;
        }
      } catch (err: any) {
        if (err?.message === 'Failed to join game' || err?.message === 'Game not found') {
          console.error("[Game Socket] Cannot rejoin: Game not found.");
          this.isReconnecting = false;
          return false; // stop retrying if game doesn't exist
        }
      }
    }
  
    console.error("[Game Socket] Max retries reached. Giving up.");
    this.isReconnecting = false;
    return false;
  }  
  
  // Join a specific room by game ID
  // public async connectGame(gameId: string, userId: number): Promise<boolean> {
  //   return new Promise((resolve, reject) => {
  //     this.gameId = gameId;
  //     this.playerId = userId;
  //     this.gameSocket = new WebSocket(`${this.baseUrl}/pong/${gameId}`);

  //     let hasResolved = false;

  //     this.gameSocket.onopen = () => {
  //       console.log("Connected to the game room:", gameId);
  //       this.retryCount = 0; // reset no. of attempts to reconnect
  //       this.sendMessage('join', { gameId: this.gameId, playerId: this.playerId }); // join game
  //       hasResolved = true;
  //       resolve(true);
  //     };

  //     // Handle WebSocket messages for the game room
  //     this.gameSocket.onmessage = (event) => {
  //       let message;
  //       try {
  //         message = JSON.parse(event.data);
  //       } catch (error) {
  //         console.log('Non-JSON message received:', event.data);
  //         return;
  //       }
  //       const { type, data } = message;
  //       this.handleGameMessages(type, data);
  //     };
  
  //     this.gameSocket.onerror = (error) => {
  //       console.error("WebSocket error:", error);
  //       if (!hasResolved) {
  //         hasResolved = true;
  //         resolve(false);
  //       }
  //     };
  
  //     // Handle disconnect/attempt to reconnect
  //     this.gameSocket.onclose = async () => {
  //       console.log("Game room connection closed.");
  //       if (!hasResolved) {
  //         hasResolved = true;
  //         resolve(false);
  //       }
  //       const success = await this.reconnectGame();
  //       if (!success) {
  //         console.warn("Could not reconnect after multiple attempts.");
  //       }
  //     };
  //   });
  // }

  // private async reconnectGame(): Promise<boolean> {
  //   if (this.isReconnecting) return false;
  //   this.isReconnecting = true;

  //   if (!this.gameId || !this.playerId) {
  //     console.error("[Game Socket] Missing gameId or playerId.");
  //     this.isReconnecting = false;
  //     return false;
  //   }
  
  //   while (this.retryCount < this.maxRetryCount) {
  //     this.retryCount++;
  //     const delay = 1000 * Math.pow(2, this.retryCount);
  //     console.log(`[Game Socket] Reconnecting in ${delay}ms...`);
  
  //     // Delay execution of next reconnect attempt
  //     await new Promise(res => setTimeout(res, delay));
  
  //     const success = await this.connectGame(this.gameId, this.playerId);
  //     if (success)
  //     {
  //       this.isReconnecting = false;
  //       return true;
  //     }
  //   }
  
  //   console.error("[Game Socket] Max retries reached. Giving up.");
  //   this.isReconnecting = false;
  //   return false;
  // }  

  /*--------------------------GAME MESSAGE HANDLERS-------------------------*/

  // Types: start, player-joined, update (update also handles pause/resume/end)
  private handleGameMessages(type: string, data: any): void {
    if (type === 'error') {
      console.error('[Game Socket] Error from server:', JSON.stringify(data, null, 2));
      if (typeof data === 'object' && data !== null && 'message' in data) {
        if (data.message === 'Game not found') {
          this.isReconnecting = false;
          this.gameSocket?.close();
        }
      }
      return;
    }
    if (type !== 'update') {
      console.log('[Game Socket] Received from server:', type, JSON.stringify(data, null, 2));
    }

    const callback = this.gameEventCallbacks.get(type);
    if (!callback) {
      console.warn(`Unhandled game message type: ${type}`);
      return;
    }
    callback(data);
  }

  // Send a message to the server
  public sendMessage(type: string, data: any): void {
    console.log('[Game Socket] Sending message to server:', type);
    if (this.gameSocket && this.gameSocket.readyState === WebSocket.OPEN) {
      this.gameSocket.send(JSON.stringify({ type, data }));
    } else {
      console.error("WebSocket connection is not open.");
    }
  }

  // Send paddle input to the server
  public sendInput(input: { paddleUp: boolean, paddleDown: boolean },
    side?: 'left' | 'right'
  ): void {
    this.sendMessage('input', {
      gameId: this.gameId,
      playerId: this.playerId,
      input: input,
      side: side // for local mode
    });
  }

  /*-----------------------------ONLINE SOCKET------------------------------*/

  // Initialize general socket for tracking online status
  public connect(): void {
    this.onlineSocket = new WebSocket(this.baseUrl);

    this.onlineSocket.onopen = () => {
      console.log("WebSocket connection established.");
    };

    this.onlineSocket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        console.log('Non-JSON message received:', event.data);
        return;
      }
      const { type, data } = message;
      console.log(`Message received: type: ${type}; data: ${data}`);
      this.handleMessages(type, data);
    };

    // Event handler when the connection is closed
    this.onlineSocket.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    // Event handler when an error occurs
    this.onlineSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  /*----------------------------MESSAGE HANDLERS----------------------------*/

  /* notified by server when:
  - friend goes online/offline
  - friend request status changes: received/cancelled, accepted/rejected
  - friend removed
  - tournament started */
  private handleMessages(type: string, data: any): void {
    if (type === 'error') {
      console.error('[Online Socket] Error from server:', JSON.stringify(data, null, 2));
      return;
    }
    if (type !== 'online-status') {
      console.log('[Online Socket] Received from server:', type, JSON.stringify(data, null, 2));
    }

    const callback = this.onUserEventCallbacks.get(type);
    if (!callback) {
      console.warn(`Unhandled online message type: ${type}`);
      return;
    }
    callback(data);
  }

  /*----------------------------CLOSE CONNECTION----------------------------*/

  close(): void {
    this.onlineSocket?.close();
    this.gameSocket?.close();
    console.log('WebSocket connections closed.');
  }
}