import { FastifyInstance, FastifyRequest } from "fastify";
import websocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import fp from 'fastify-plugin';

// key: user ID, value: client socket
const onlineUsers = new Map<number, WebSocket>();

async function websocketRoutes(server: FastifyInstance) {
  server.get('/', { websocket: true }, async (connection: WebSocket, request: FastifyRequest) => {
    // Check for access token (only connect)
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
    
    connection.on('message', (msg: string) => {
        const message = JSON.parse(msg);

        console.log(`Received: ${message}`);
        connection.send(`Echo: ${message}`);
    });
  
    connection.on('close', () => {
        console.log('Client disconnected');
    });
  });
}

export default fp(async function setupWebSocket(server: FastifyInstance) {
  server.register(websocketRoutes, {
    prefix: '/ws',
  });
});