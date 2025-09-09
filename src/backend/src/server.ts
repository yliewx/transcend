import fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import fs from 'fs';
import { publicDir, uploadsDir, avatarsDir } from './constants';
import setupJwt from './plugins/jwt';
import { setupDbConnection } from './db';
import setupRoutes from './routes';
import setupMailer from './plugins/mailer';
import setupTwilio from './plugins/twilio';
import setupGoogleAuth from './plugins/oauth2';
import authRoutes from './auth/routes/auth.routes';
import setupWebSocket from './game/routes/ws.routes'
import { TournamentManager } from './game/tournament.manager';
import fastifyMultipart from '@fastify/multipart';


setupDbConnection();

const server = fastify();

fs.mkdirSync(avatarsDir, { recursive: true });

server.register(setupJwt);
server.register(fastifyCookie);
server.register(fastifyMultipart, {
  limits: {
    fieldNameSize: 100,
    fieldSize: 100,
    fields: 10,
    fileSize: 5000000,
    files: 1,
    headerPairs: 2000
  }
});
server.register(fastifyStatic, {
  root: publicDir,
  prefix: '/'
});
server.register(setupMailer);
server.register(setupTwilio);
server.register(setupGoogleAuth);
server.register(websocket, {
  options: {
    clientTracking: true,
  }
});

server.register(authRoutes);
server.register(setupRoutes);
server.register(setupWebSocket);

setInterval(async () => {
  try {
    await TournamentManager.processTournaments();
  } catch (error) {
    console.error('Error in tournament processing:', error);
  }
}, 1000);


const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server listening at http://0.0.0.0:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();