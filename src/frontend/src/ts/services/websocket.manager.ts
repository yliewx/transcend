export class WebSocketManager {
  private onlineSocket: WebSocket | null = null;
  private gameSocket: WebSocket | null = null;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /*------------------------------GAME SOCKET-------------------------------*/

  // Join a specific room by game ID
  joinGame(gameId: string) {
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
      console.log(`Message received: type: ${type}; data: ${data}`);
      this.handleGameMessages(type, data);
    };

    this.gameSocket.onopen = () => {
      console.log("Joined the game room:", gameId);
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
  connect(): void {
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
      default:
        console.warn(`Unhandled message type: ${type}`);
    }
  }

  private handleGameMessages(type: string, data: any): void {
    switch (type) {
      case 'game-start':
        this.handleGameStart();
        break;
      case 'game-end':
        this.handleGameEnd(data.winner);
        break;
      case 'state':
        this.handleGameState(data);
        break;
      default:
        console.warn(`Unhandled game message type: ${type}`);
    }
  }

  private handleOnlineStatus(data: any): void {
    console.log('Online status updated:', data);
  }

  private handleGameStart() {
    console.log("Game has started.");
    // Handle game start event on the frontend (e.g., show game state)
  }

  private handleGameEnd(winner: 'left' | 'right') {
    console.log(`Game over! Winner: ${winner}`);
    // Show game-over screen and winner on the frontend
  }

  private handleGameState(state: any) {
    console.log("Game state:", state);
    // Update game state on the frontend (e.g., update paddles, ball position)
  }

  // Send a message to the server
  sendMessage(type: string, data: any): void {
    if (this.gameSocket && this.gameSocket.readyState === WebSocket.OPEN) {
      this.gameSocket.send(JSON.stringify({ type, data }));
    } else {
      console.error("WebSocket connection is not open.");
    }
  }

  /*----------------------------CLOSE CONNECTION----------------------------*/

  close(): void {
    this.onlineSocket?.close();
    this.gameSocket?.close();
    console.log('WebSocket connections closed');
  }
}