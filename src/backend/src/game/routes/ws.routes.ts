import { FastifyInstance, FastifyRequest } from "fastify";
import websocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import { gameManager } from "../GameManager";
import fp from 'fastify-plugin';
import { onlineUsers, sendError } from "../ws.types";
import { getDb } from "../../db";
import Friend from "../../models/friend";

interface PongParams {
  gameId: string;
}

// Notify user's online friends
export async function notifyFriends(userId: number, online: boolean) {
  try {
    const db = await getDb();
    const friends = await Friend.getFriendsList(db, userId);
    friends.forEach((friend: any) => {
      // Check if friends are online
      const friendSocket = onlineUsers.get(friend.user_id);
      if (friendSocket && friendSocket.readyState === WebSocket.OPEN) {
        friendSocket.send(JSON.stringify({
          type: 'online-status',
          data: { userId, online }
        }));
      }
    })
  } catch (error) {
    console.log('Failed to notify friends:', error);
  }
}

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
    notifyFriends(user.id, true);

    // Ping client every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.ping();
      }
    }, 30000);
    
    // Message handler
    connection.on('message', (msg: string) => {
      const message = JSON.parse(msg);
      console.log(`Received: ${message}`);
      connection.send(`Echo: ${message}`);
    });
  
    connection.on('close', () => {
      clearInterval(pingInterval);
      console.log(`User disconnected: ${user.id}`);
      onlineUsers.delete(user.id);
      notifyFriends(user.id, false);
    });

    connection.on('error', () => {
      clearInterval(pingInterval);
      console.log(`Error in online socket: ${user.id}`);
      onlineUsers.delete(user.id);
      notifyFriends(user.id, false);
    });    
  });

  /*-----------------------------GAME SESSION-------------------------------*/
  
  server.get('/pong/:gameId', { websocket: true }, async (connection: WebSocket, request: FastifyRequest<{ Params: PongParams }>) => {
    // Check for access token
    try {
        const user = await request.server.authenticateUser(request);
    } catch (error) {
        console.log('Connection failed:', error);
        connection.close();
        return;
    }
    // On connection: Extract game ID and get game instance
    const gameId = request.params.gameId;
    const room = gameManager.getRoom(gameId);
    if (!room) {
      sendError(connection, 'Game not found');
      return;
    }
    // connection.send(`Connected to game ID: ${gameId}`);

    // Message handler
    connection.on('message', function onFirstMessage (msg: any) {
      const message = JSON.parse(msg.toString());
      console.log('[ws.routes] Full message:', message.type, JSON.stringify(message.data, null, 2));

      if (message.type === 'join') {
        const joinSuccess = gameManager.joinRoom(message.data, connection);
          if (joinSuccess) {
            connection.off('message', onFirstMessage);
          }
      } else {
        sendError(connection, `Unrecognized message type: ${message.type}. Please join a game first.`);
      }
    });    
  });

  /*----------------------------GAME CLI SESSION----------------------------*/

  server.get('/pong/cli/:gameId', { websocket: true }, async (connection: WebSocket, request: FastifyRequest<{ Params: PongParams }>) => {
    // Check for access token
    let user;
    try {
        user = await request.server.authenticateUser(request);
    } catch (error) {
        console.log('Connection failed:', error);
        connection.close();
        return;
    }
    // On connection: Extract game ID and get game instance
    const gameId = request.params.gameId;
    const room = gameManager.getRoom(gameId);
    if (!room) {
      sendError(connection, 'Game not found');
      return;
    }
    // connection.send(`Connected to game ID: ${gameId}`);
    const playerId = user.id;

    // Message handler
    connection.on('message', (msg: string) => {
      const message = JSON.parse(msg.toString());
      console.log('[ws.routes] Full message:', message.type, JSON.stringify(message.data, null, 2));

      switch (message.type) {
        case 'join':
          const joinSuccess = gameManager.joinRoom(message.data, connection);
          if (joinSuccess) {
            console.log('Successfully joined game via CLI');
          }
          break ;
        case 'input':
          room.handleInput({ ...message.data, playerId }, connection);
          break;
        case 'start':
          room.startGame(connection);
          break;
        case 'pause':
          room.pauseGame(connection);
          break;
        default:
          sendError(connection, `Unrecognized message type: ${message.type}.`);
          break;
      }
    });    
  });
}

export default fp(async function setupWebSocket(server: FastifyInstance) {
  server.register(websocketRoutes, {
    prefix: '/ws',
  });
});