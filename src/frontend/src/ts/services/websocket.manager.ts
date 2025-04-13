import { GameState } from "../types";

export class WebSocketManager {
  private baseUrl: string;
  private onlineSocket: WebSocket | null = null;
  private gameSocket: WebSocket | null = null;
  private gameId: string | null = null;
  private playerId: number | null = null;
  private gameEventCallbacks: Map<string, (data: any) => void> = new Map();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Register handler functions from PongGamePage
  public onGameEvent(type: string, callback: (data: any) => void): void {
    this.gameEventCallbacks.set(type, callback);
  }  

  /*------------------------------GAME SOCKET-------------------------------*/

  // Join a specific room by game ID
  public connectGame(gameId: string, userId: number) {
    this.gameId = gameId;
    this.playerId = userId;
    this.gameSocket = new WebSocket(`${this.baseUrl}/pong/${gameId}`);

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

    this.gameSocket.onopen = () => {
      console.log("Connected to the game room:", gameId);
      // Join game
      this.sendMessage('join', { gameId, playerId: userId });
    };

    this.gameSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.gameSocket.onclose = () => {
      console.log("Game room connection closed");
    };
  }

  /*-----------------------------ONLINE SOCKET------------------------------*/

  // Initialize general socket for tracking online status
  public connect(): void {
    this.onlineSocket = new WebSocket(this.baseUrl);

    this.onlineSocket.onopen = () => {
      console.log("WebSocket connection established");
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
      console.log("WebSocket connection closed");
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
        this.handleOnlineStatus(data);
        break;
      case 'error':
        console.error('Error:', ...data);
        break;
      default:
        console.warn(`Unhandled message type: ${type}`);
    }
  }

  // Types: start, update state (also handles pause, resume, end)
  private handleGameMessages(type: string, data: any): void {
    // console.log('[WebSocketManager] Received from server:', type, JSON.stringify(data, null, 2));

    const callback = this.gameEventCallbacks.get(type);
    if (!callback) {
      console.warn(`Unhandled game message type: ${type}`);
      return;
    }
    callback(data);
  }

  private handleOnlineStatus(data: any): void {
    console.log('Online status:', data);
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

  /*----------------------------CLOSE CONNECTION----------------------------*/

  close(): void {
    this.onlineSocket?.close();
    this.gameSocket?.close();
    console.log('WebSocket connections closed');
  }
}