export class WebSocketManager {
  private baseUrl: string;
  private onlineSocket: WebSocket | null = null;
  private gameSocket: WebSocket | null = null;
  private gameId: string | null = null;
  private playerId: string | null = null;
  private gameEventCallbacks: Map<string, (data: any) => void> = new Map();
  private onUserEventCallbacks: Map<string, (data: any) => void> = new Map();
  private onTournamentEventCallbacks: Map<string, (data: any) => void> = new Map();
  private retryState = {
    game: { isReconnecting: false, retryCount: 0, maxRetry: 5 },
    online: { isReconnecting: false, retryCount: 0, maxRetry: 5 },
  };
  private heartbeat: ReturnType<typeof setInterval> | null = null;

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

  public async connectGame(gameId: string, userId: string): Promise<boolean> {
    if (this.gameSocket) {
      this.disconnectGame();
    }
    this.gameId = gameId;
    this.playerId = userId;
  
    try {
      this.gameSocket = new WebSocket(`${this.baseUrl}pong/${gameId}`);
      await this.waitForSocketOpen(this.gameSocket);
    
      const joinSuccess = await this.waitForJoin(this.gameSocket);
      if (!joinSuccess) {
        this.gameSocket.close();
        throw new Error('Failed to join game');
      }
  
      this.retryState.game.retryCount = 0;
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
      this.reconnectGameSocket;
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
    const state = this.retryState.game;
    state.retryCount = 0;
    state.isReconnecting = false;
  }

  /*----------------------------RECONNECT TO GAME---------------------------*/

  // private async reconnectGameSocket: Promise<boolean> {
  //   if (this.gameStatus.isReconnecting) return false;
  //   this.gameStatus.isReconnecting = true;
  
  //   if (!this.gameId || !this.playerId) {
  //     console.error("[Game Socket] Missing gameId or playerId.");
  //     this.gameStatus.isReconnecting = false;
  //     return false;
  //   }
  
  //   while (this.gameStatus.retryCount < this.gameStatus.maxRetry) {
  //     this.gameStatus.retryCount++;
  //     const delay = 1000 * Math.pow(2, this.gameStatus.retryCount);
  
  //     console.log(`[Game Socket] Reconnecting attempt ${this.gameStatus.retryCount} in ${delay}ms...`);
  
  //     await new Promise(res => setTimeout(res, delay));
  
  //     try {
  //       const success = await this.connectGame(this.gameId, this.playerId);
  //       if (success) {
  //         console.log("[Game Socket] Reconnected successfully!");
  //         this.gameStatus.isReconnecting = false;
  //         return true;
  //       }
  //     } catch (err: any) {
  //       if (err?.message === 'Failed to join game' || err?.message === 'Game not found') {
  //         console.error("[Game Socket] Cannot rejoin: Game not found.");
  //         this.gameStatus.isReconnecting = false;
  //         return false; 
  //       }
  //     }
  //   }
  
  //   console.error("[Game Socket] Max retries reached. Giving up.");
  //   this.gameStatus.isReconnecting = false;
  //   return false;
  // }

  /*--------------------------GAME MESSAGE HANDLERS-------------------------*/

  private handleGameMessages(type: string, data: any): void {
    if (type === 'error') {
      console.error('[Game Socket] Error from server:', JSON.stringify(data, null, 2));
      if (typeof data === 'object' && data !== null && 'message' in data) {
        if (data.message === 'Game not found') {
          this.retryState.game.isReconnecting = false;
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

  public async connect(): Promise<boolean> {
    if (this.onlineSocket) {
      this.disconnectOnline();
    }
    const state = this.retryState.online;
  
    try {
      this.onlineSocket = new WebSocket(this.baseUrl);
      await this.waitForSocketOpen(this.onlineSocket);
      this.setupOnlineSocketHandlers();
      this.startHeartbeat();
  
      console.log("[Online Socket] Successfully connected to server!");
      state.retryCount = 0;
      state.isReconnecting = false;
      return true;
    } catch (err) {
      console.error("[Online Socket] Connection error:", err);
      this.onlineSocket?.close();
      return false;
    }
  }

  private setupOnlineSocketHandlers(): void {
    if (!this.onlineSocket) return;

    this.onlineSocket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        return;
      }
      const { type, data } = message;
      if (type === 'pong') {
        // console.log('[Online Socket] Pong received from server.');
        return;
      }
      this.handleMessages(type, data);
    };

    this.onlineSocket.onclose = () => {
      //console.warn("WebSocket connection closed.");
      this.endHeartbeat();
      this.reconnectOnlineSocket();
    };

    this.onlineSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.endHeartbeat();
      this.reconnectOnlineSocket();
    };
  }

  private startHeartbeat(): void {
    this.heartbeat = setInterval(() => {
      if (this.onlineSocket?.readyState === WebSocket.OPEN) {
        this.onlineSocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private endHeartbeat(): void {
    if (this.heartbeat !== null) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  private disconnectOnline(): void {
    if (this.onlineSocket) {
      this.onlineSocket.onclose = () => {
        console.log('[Online Socket] Connection closed.');
      };      
      this.onlineSocket.close();
      this.onlineSocket = null;
    }
    
    const state = this.retryState.online;
    state.retryCount = 0;
    state.isReconnecting = false;
  }

  /*----------------------------MESSAGE HANDLERS----------------------------*/

  private handleMessages(type: string, data: any): void {
    if (type === 'error') {
      console.error('[Online Socket] Error from server:', JSON.stringify(data, null, 2));
      return;
    }

    // console.log(`New message [${type}]:`, JSON.stringify(data, null, 2));

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

  /*-------------------------RECONNECT ONLINE SOCKET------------------------*/

  private async reconnectSocket(
    socketType: 'game' | 'online',
    connectFn: () => Promise<boolean>
  ): Promise<boolean> {
    const state = this.retryState[socketType];
  
    if (state.isReconnecting) return false;
    state.isReconnecting = true;
  
    while (state.retryCount < state.maxRetry) {
      state.retryCount++;
      const interval = 1000 * Math.pow(2, state.retryCount);
  
      //console.log(`[${socketType} socket] Reconnect attempt ${state.retryCount} in ${interval}ms...`);
      await this.delay(interval);
  
      try {
        const success = await connectFn();
        if (success) {
          //console.log(`[${socketType} socket] Reconnected successfully!`);
          state.retryCount = 0;
          state.isReconnecting = false;
          return true;
        }
      } catch (err: any) {
        if (err?.message === 'Failed to join game' || err?.message === 'Game not found') {
          console.error(`[${socketType} socket] Cannot rejoin: ${err.message}`);
          state.isReconnecting = false;
          return false;
        }
      }
    }
  
    console.error(`[${socketType} socket] Max retries reached. Giving up.`);
    if (socketType === 'online') {
      this.passiveReconnect();
    }
    state.isReconnecting = false;
    return false;
  }

  private reconnectGameSocket(): Promise<boolean> {
    return this.reconnectSocket('game', async () => {
      return await this.connectGame(this.gameId!, this.playerId!);
    });
  }

  private reconnectOnlineSocket(): Promise<boolean> {
    return this.reconnectSocket('online', async () => {
      return await this.connect();
    });
  }

  private async passiveReconnect(interval: number = 30000): Promise<void> {
    console.log("[Online Socket] Passive reconnecting every 30s...");
  
    while (!this.onlineSocket || this.onlineSocket.readyState === WebSocket.CLOSED) {
      await this.delay(interval);
  
      console.log("[Online Socket] Passive reconnect attempt...");

      const success = await this.connect();
      if (success) {
        console.log("[Online Socket] Passive reconnect successful!");
        break;
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }

  /*----------------------------CLOSE CONNECTION----------------------------*/

  close(): void {
    this.disconnectOnline();
    this.disconnectGame();
    console.log('WebSocket connections closed.');
  }

  isConnected(): boolean {
    return this.onlineSocket?.readyState === WebSocket.OPEN;
  }
}