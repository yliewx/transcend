import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import fastifyCookie from '@fastify/cookie'
// From ./plugins
import setupJwt from './plugins/jwt';
import setupCors from './plugins/cors';
import { setupDbConnection } from './db';
// import { registerRoutes } from './routes';
import setupRoutes from './routes';
import setupMailer from './plugins/mailer';
import setupTwilio from './plugins/twilio';

// Initialize database
setupDbConnection();

// Create Fastify server
const server = fastify({
  logger: true
});

// Register plugins to serve static files
server.register(fastifyStatic, {
  root: join(__dirname, '../../public'),
  prefix: '/'
});

server.addHook("onRequest", async (req, reply) => {
  server.log.info(`Received request: ${req.method} ${req.url}`);
});

// Register plugins for authentication
server.register(setupJwt);
server.register(fastifyCookie);
server.register(setupMailer);
server.register(setupTwilio);

// Register routes
server.register(setupCors);
server.register(setupRoutes);

// Start server
const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server listening at http://0.0.0.0:3000');

    // Check if your environment variables are loaded at startup
   
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

