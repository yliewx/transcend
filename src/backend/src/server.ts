import fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import fastifyCookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import fs from 'fs';
// From ./plugins
import setupJwt from './plugins/jwt';
import setupCors from './plugins/cors';
import { setupDbConnection } from './db';
import setupRoutes from './routes';
import setupMailer from './plugins/mailer';
import setupTwilio from './plugins/twilio';
import setupGoogleAuth from './plugins/oauth2';
import authRoutes from './auth/routes/auth.routes';
import setupWebSocket from './game/routes/ws.routes'
import { TournamentManager } from './game/tournament.manager';
import fastifyMultipart from '@fastify/multipart';

// Initialize database
setupDbConnection();

// Create Fastify server
const server = fastify({
  logger: true
});

// Ensure public directories exist
//const publicDir = join(__dirname, '../../public');
const publicDir = '/usr/src/app/public';


const uploadsDir = join(publicDir, 'uploads');
const avatarsDir = join(uploadsDir, 'avatars');

// Create directories if they don't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Register CORS first (often needs to be early)
// server.register(setupCors);

// Register plugins for authentication
server.register(setupJwt);
server.register(fastifyCookie);

// Register multipart before routes that might use it
server.register(fastifyMultipart, {
  limits: {
    fieldNameSize: 100,     // Max field name size in bytes
    fieldSize: 100,         // Max field value size in bytes
    fields: 10,             // Max number of non-file fields
    fileSize: 5000000,      // Max file size in bytes (5MB)
    files: 1,               // Max number of file fields
    headerPairs: 2000       // Max number of header key=>value pairs
  }
});

// Register static file serving after ensuring directories exist
server.register(fastifyStatic, {
  root: publicDir,
  prefix: '/'
});


// Register other plugins
server.register(setupMailer);
server.register(setupTwilio);
server.register(setupGoogleAuth);

// Register websocket after authentication plugins
server.register(websocket, {
  options: {
    clientTracking: true,
  }
});

server.addHook("onRequest", async (req, reply) => {
  server.log.info(`Received request: ${req.method} ${req.url}`);
});

// Register routes after all plugins are registered
server.register(authRoutes);
server.register(setupRoutes);
server.register(setupWebSocket);

// Set up periodic tournament processing
setInterval(async () => {
  try {
    await TournamentManager.processTournaments();
  } catch (error) {
    console.error('Error in tournament processing:', error);
  }
}, 1000);

// Start server
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