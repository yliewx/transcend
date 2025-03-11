import { FastifyInstance } from 'fastify';
import { registerUser } from './controllers/register';

export function registerRoutes(server: FastifyInstance) {
  // User registration
  server.post('/api/register', registerUser);
  
  // // Catch-all route for SPA
  // server.get('*', (request, reply) => {
  //   reply.sendFile('index.html');
  // });
  server.setNotFoundHandler((request, reply) => {
    // Only handle GET requests for HTML pages
    if (request.method !== 'GET' || !request.headers.accept?.includes('text/html')) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    reply.sendFile('index.html');
  });
}
