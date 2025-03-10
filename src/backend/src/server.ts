import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { setupDbConnection } from './db';
import { registerRoutes } from './routes';
import fastifyCors from '@fastify/cors';

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

// Register routes
registerRoutes(server);

// Enable CORS for the frontend running on port 8080
server.register(fastifyCors, {
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  // credentials: true // If you need to send cookies or authentication headers
});

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