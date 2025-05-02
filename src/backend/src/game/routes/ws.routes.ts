import { FastifyInstance, FastifyRequest } from "fastify";
import websocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import { gameManager } from "../GameManager";
import fp from 'fastify-plugin';
import { onlineUsers, sendError } from "../ws.types";
import { getDb } from "../../db";
import Friend from "../../models/friend";
import chalk from 'chalk';
import { AuthTokenPayload } from "../../../@types/global";

interface PongParams {
  gameId: string;
}

export async function notifyFriends(userId: number, online: boolean) {
  try {
    const db = await getDb();
    const friends = await Friend.getFriendsList(db, userId);
    friends.forEach((friend: any) => {
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
    let user;

    try {
        user = await request.server.authenticateUser(request);
    } catch (error) {
      console.log('Connection failed:', error);
      connection.close();
      return;
    }
    console.log(chalk.green.bold('\n[ws.routes] New online socket connection'));
    printAuthTokenPayload(user);
    connection.send('Connected to server');

    onlineUsers.set(user.id, connection);
    notifyFriends(user.id, true);

    const pingInterval = setInterval(() => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.ping();
      }
    }, 30000);
    
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
    let user;
    try {
        user = await request.server.authenticateUser(request);
    } catch (error) {
        console.log('Connection failed:', error);
        connection.close();
        return;
    }

    const gameId = request.params.gameId;
    const room = gameManager.getRoom(gameId);
    if (!room) {
      sendError(connection, 'Game not found');
      return;
    }
    
    console.log(chalk.green.bold('\n[/pong/:gameId] New connection to game: ' + chalk.green(gameId)));
    printAuthTokenPayload(user);

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
    let user;
    try {
        user = await request.server.authenticateUser(request);
    } catch (error) {
        console.log('Connection failed:', error);
        connection.close();
        return;
    }

    const gameId = request.params.gameId;
    const room = gameManager.getRoom(gameId);
    if (!room) {
      sendError(connection, 'Game not found');
      return;
    }

    const playerId = user.id;
    console.log(chalk.green.bold('\n[/pong/cli/:gameId] New CLI connection to game: ' + chalk.green(gameId)));
    printAuthTokenPayload(user);

    connection.on('message', (msg: string) => {
      const message = JSON.parse(msg.toString());
      console.log('[ws.routes] Full message:', message.type, JSON.stringify(message.data, null, 2));

      switch (message.type) {
        case 'join':
          const joinSuccess = gameManager.joinRoomByCLI({ ...message.data, playerId }, connection);
          if (joinSuccess) {
            console.log('Successfully joined game via CLI');
          } else {
            console.error('Could not join game via CLI');
            sendError(connection, 'Please open the game in the browser.');
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

function printAuthTokenPayload(user: AuthTokenPayload) {
  console.log(chalk.green(`→ User ID     : `) + chalk.whiteBright(user.id));
  console.log(chalk.green(`→ Username    : `) + chalk.whiteBright(user.username || 'N/A'));
  console.log(chalk.green(`→ Email       : `) + chalk.whiteBright(user.email || 'N/A'));
  console.log(chalk.green(`→ Token Type  : `) + chalk.whiteBright(user.token_type));
  console.log(chalk.green(`→ Issued At   : `) + chalk.whiteBright(user.iat ? new Date(user.iat * 1000).toISOString() : 'N/A'));
  console.log(chalk.green(`→ Expires At  : `) + chalk.whiteBright(user.exp ? new Date(user.exp * 1000).toISOString() : 'N/A'));
  console.log();
}
