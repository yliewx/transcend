export class WebSocketManager {
  private baseUrl: string;
  private onlineSocket: WebSocket | null = null;
  private gameSocket: WebSocket | null = null;
  private gameId: string | null = null;
  private playerId: number | null = null;
  private gameEventCallbacks: Map<string, (data: any) => void> = new Map();
  private onUserEventCallbacks: Map<string, (data: any) => void> = new Map();
  private onTournamentEventCallbacks: Map<string, (data: any) => void> = new Map();
  private retryCount: number = 0;
  private maxRetryCount: number = 5;
  private isReconnecting: boolean = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public onGameEvent(type: string, callback: (data: any) => void): void {
    this.gameEventCallbacks.set(type, callback);
  }

  public onUserEvent(type: string, callback: (data: any) => void): void {
    this.onUserEventCallbacks.set(type, callback);
  }

  public onTournamentEvent(type: string, callback: (data: any) => void): void {
    this.onTournamentEventCallbacks.set(type, callback);
  }

  /*------------------------------GAME SOCKET-------------------------------*/

  public async connectGame(gameId: string, userId: number): Promise<boolean> {
    if (this.gameSocket) {
      this.disconnectGame();
    }
    this.gameId = gameId;
    this.playerId = userId;
    this.retryCount = 0;
  
    try {
      this.gameSocket = new WebSocket(`${this.baseUrl}/pong/${gameId}`);
      await this.waitForSocketOpen(this.gameSocket);
    
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
            break
        }
      };
  
      socket.addEventListener('message', onMessage);
  
      this.sendMessage('join', { gameId: this.gameId, playerId: this.playerId });
    });
  }

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

  public disconnectGame(): void {
    if (this.gameSocket) {
      this.gameSocket.onclose = () => {
        console.log('[Game Socket] Connection closed during game reset.');
      };      
      this.gameSocket.close();
      this.gameSocket = null;
    }
    
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
          return false; 
        }
      }
    }
  
    console.error("[Game Socket] Max retries reached. Giving up.");
    this.isReconnecting = false;
    return false;
  }  
   

  /*--------------------------GAME MESSAGE HANDLERS-------------------------*/

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

    const callback = this.gameEventCallbacks.get(type);
    if (!callback) {
      console.warn(`Unhandled game message type: ${type}`);
      return;
    }
    callback(data);
  }

  public sendMessage(type: string, data: any): void {
    if (this.gameSocket && this.gameSocket.readyState === WebSocket.OPEN) {
      this.gameSocket.send(JSON.stringify({ type, data }));
    } else {
      console.error("WebSocket connection is not open.");
    }
  }

  public sendInput(input: { paddleUp: boolean, paddleDown: boolean },
    side?: 'left' | 'right'
  ): void {
    this.sendMessage('input', {
      gameId: this.gameId,
      playerId: this.playerId,
      input: input,
      side: side
    });
  }

  /*-----------------------------ONLINE SOCKET------------------------------*/

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
        return;
      }
      const { type, data } = message;
      this.handleMessages(type, data);
    };

    this.onlineSocket.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    this.onlineSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  /*----------------------------MESSAGE HANDLERS----------------------------*/

  private handleMessages(type: string, data: any): void {
    if (type === 'error') {
      console.error('[Online Socket] Error from server:', JSON.stringify(data, null, 2));
      return;
    }

    const userCallback = this.onUserEventCallbacks.get(type);
    if (userCallback) {
      userCallback(data);
      return;
    }
  
    const tournamentCallback = this.onTournamentEventCallbacks.get(type);
    if (tournamentCallback) {
      tournamentCallback(data);
      return;
    }

    console.warn(`Unhandled online message type: ${type}`);
  }

  /*----------------------------CLOSE CONNECTION----------------------------*/

  close(): void {
    this.onlineSocket?.close();
    this.gameSocket?.close();
    console.log('WebSocket connections closed.');
  }
}