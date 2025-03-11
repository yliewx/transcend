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

// Register plugins for authentication
server.register(setupJwt);
server.register(fastifyCookie);

// Register routes
// registerRoutes(server);
server.register(setupRoutes);
server.register(setupCors);

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