import { GameState } from "../types";

export class WebSocketManager {
  private baseUrl: string;
  private onlineSocket: WebSocket | null = null;
  private gameSocket: WebSocket | null = null;
  private gameId: string | null = null;
  private playerId: number | null = null;
  private gameEventCallbacks: Map<string, (data: any) => void> = new Map();
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

  /*------------------------------GAME SOCKET-------------------------------*/

  // Join a specific room by game ID
  public async connectGame(gameId: string, userId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.gameId = gameId;
      this.playerId = userId;
      this.gameSocket = new WebSocket(`${this.baseUrl}/pong/${gameId}`);

      let hasResolved = false;

      this.gameSocket.onopen = () => {
        console.log("Connected to the game room:", gameId);
        this.retryCount = 0; // reset no. of attempts to reconnect
        this.sendMessage('join', { gameId: this.gameId, playerId: this.playerId }); // join game
        hasResolved = true;
        resolve(true);
      };

      // Handle WebSocket messages for the game room
      this.gameSocket.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.log('Non-JSON message received:', event.data);
          return;
        }
        const { type, data } = message;
        this.handleGameMessages(type, data);
      };
  
      this.gameSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (!hasResolved) {
          hasResolved = true;
          resolve(false);
        }
      };
  
      // Handle disconnect/attempt to reconnect
      this.gameSocket.onclose = async () => {
        console.log("Game room connection closed.");
        if (!hasResolved) {
          hasResolved = true;
          resolve(false);
        }
        const success = await this.reconnectGame();
        if (!success) {
          console.warn("Could not reconnect after multiple attempts.");
        }
      };
    });
  }

  private async reconnectGame(): Promise<boolean> {
    if (this.isReconnecting) return false;
    this.isReconnecting = true;

    if (!this.gameId || !this.playerId) {
      console.error("[WebSocketManager] Missing gameId or playerId.");
      this.isReconnecting = false;
      return false;
    }
  
    while (this.retryCount < this.maxRetryCount) {
      this.retryCount++;
      const delay = 1000 * Math.pow(2, this.retryCount);
      // console.log(`[WebSocketManager] Reconnecting in ${delay}ms...`);
  
      // Delay execution of next reconnect attempt
      await new Promise(res => setTimeout(res, delay));
  
      const success = await this.connectGame(this.gameId, this.playerId);
      if (success)
      {
        this.isReconnecting = false;
        return true;
      }
    }
  
    console.error("[WebSocketManager] Max retries reached. Giving up.");
    this.isReconnecting = false;
    return false;
  }  

  /*--------------------------GAME MESSAGE HANDLERS-------------------------*/

  // Types: start, player-joined, update (update also handles pause/resume/end)
  private handleGameMessages(type: string, data: any): void {
    if (type === 'error') {
      console.error('[WebSocketManager] Error from server:', JSON.stringify(data, null, 2));
      return;
    }
    if (type !== 'update') {
      console.log('[WebSocketManager] Received from server:', type, JSON.stringify(data, null, 2));
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
    console.log('[WebSocketManager] Sending message to server:', type);
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
  /* - new request received
  - request cancelled
  - friend-accepted
  - friend-rejected */
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

  private handleMessages(type: string, data: any): void {
    switch (type) {
      case 'online-status':
        // this.handleOnlineStatus(data);
        break;
      case 'error':
        console.error('Error:', ...data);
        break;
      default:
        console.warn(`Unhandled message type: ${type}`);
    }
  }

  /*----------------------------CLOSE CONNECTION----------------------------*/

  close(): void {
    this.onlineSocket?.close();
    this.gameSocket?.close();
    console.log('WebSocket connections closed.');
  }
}