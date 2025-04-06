export class WebSocketManager {
  private socket: WebSocket | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  /*----------------------------INIT CONNECTION-----------------------------*/

  // Initialize the WebSocket connection
  connect(): void {
    this.socket = new WebSocket(this.url);

    // Event handler when the connection is open
    this.socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    // Event handler when a message is received
    this.socket.onmessage = (event) => {
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
    this.socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    // Event handler when an error occurs
    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  /*----------------------------MESSAGE HANDLERS----------------------------*/

  private handleMessages(type: string, data: any): void {
    switch (type) {
      case 'online-status':
        this.handleOnlineStatus(data);
        break;
      // case 'tournament-update':
      //   this.handleTournamentUpdate(data);
      //   break;
      // case 'game-state':
      //   this.handleGameState(data);
      //   break;
      default:
        console.warn(`Unhandled message type: ${type}`);
    }
  }

  private handleOnlineStatus(data: any): void {
    // console.log('Online status updated:', data);
  }

  // Send a message to the server
  sendMessage(type: string, data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    } else {
      console.error("WebSocket connection is not open.");
    }
  }

  /*----------------------------CLOSE CONNECTION----------------------------*/

  close(): void {
    if (this.socket) {
      this.socket.close();
      console.log('WebSocket connection closed');
    }
  }
}
