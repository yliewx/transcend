import { FastifyInstance, FastifyRequest } from "fastify";
import websocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import { gameManager } from "../GameManager";
import fp from 'fastify-plugin';
import { sendError } from "../message.types";

// type: 'input';
export interface InputMessage {
  gameId: string;
  playerId: number;
  side?: 'left' | 'right'; // local play only
  input: {
    paddleUp: boolean;
    paddleDown: boolean;
  };
};

interface PongParams {
  gameId: string;
}

// key: user ID, value: client socket
const onlineUsers = new Map<number, WebSocket>();

async function websocketRoutes(server: FastifyInstance) {  
  /*-----------------------------ONLINE STATUS------------------------------*/
  
  server.get('/', { websocket: true }, async (connection: WebSocket, request: FastifyRequest) => {
    // Check for access token
    let user;
    try {
        user = await request.server.authenticateUser(request);
    } catch (error) {
        console.log('Connection failed:', error);
        connection.close();
        return;
    }
    console.log(`New WebSocket connection: ${JSON.stringify(user)}`);
    connection.send('Connected to server');

    // Add user to map of online users
    onlineUsers.set(user.id, connection);
    
    // Message handler
    connection.on('message', (msg: string) => {
        const message = JSON.parse(msg);

        console.log(`Received: ${message}`);
        connection.send(`Echo: ${message}`);
    });
  
    connection.on('close', () => {
        console.log(`User disconnected: ${user.id}`);
        onlineUsers.delete(user.id);
    });
  });

  /*-----------------------------GAME SESSION-------------------------------*/
  
  server.get('/pong/:gameId', { websocket: true }, async (connection: WebSocket, request: FastifyRequest<{ Params: PongParams }>) => {
    // On connection: Extract game ID and get game instance
    const gameId = request.params.gameId;
    const room = gameManager.getRoom(gameId);
    if (!room) {
      sendError(connection, 'Game not found');
      return;
    }
    connection.send(`Connected to game ID: ${gameId}`);

    // Message handler
    connection.on('message', function onFirstMessage (msg: any) {
      const message = JSON.parse(msg.toString());
      console.log('[ws.routes] Full message:', message.type, JSON.stringify(message.data, null, 2));

      switch (message.type) {
        case 'join':
          const joinSuccess = room.addPlayer(message.data, connection);
          if (joinSuccess) {
            connection.off('message', onFirstMessage);
          }
          break ;
        case 'delete':
          gameManager.deleteGame(gameId);
          break ;
        // Other valid message types will be handled by the room after joining
        default:
          break ;
      }
    });    
  });
}

export default fp(async function setupWebSocket(server: FastifyInstance) {
  server.register(websocketRoutes, {
    prefix: '/ws',
  });
});