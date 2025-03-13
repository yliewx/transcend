import { FastifyInstance } from 'fastify';
import { registerUser } from './controllers/user.register';
import { loginHandler, logoutHandler, profileHandler } from './controllers/auth.controller';
import fp from 'fastify-plugin';
import { AuthenticatedRequest } from '../@types/fastify';

export default fp(async function setupRoutes(server: FastifyInstance) {
  // User registration
  server.post('/api/register', registerUser);

  // Authentication routes
  server.post('/login', loginHandler);
  server.post('/logout', logoutHandler);
  //server.get('/profile', { preValidation: [server.authenticate] }, profileHandler);
  server.get('/profile', { preHandler: server.authenticate }, (request, reply) => {
    // Use type assertion here
    return profileHandler(request as AuthenticatedRequest, reply);
  });
  // Catch-all route for SPA
  server.setNotFoundHandler((request, reply) => {
    // Only handle GET requests for HTML pages
    if (request.method !== 'GET' || !request.headers.accept?.includes('text/html')) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    reply.sendFile('index.html');
  });
})

// export function registerRoutes(server: FastifyInstance) {
//   // User registration
//   server.post('/api/register', registerUser);

//   // Authentication routes
//   server.post('/login', loginHandler);
//   server.post('/logout', logoutHandler);
//   server.get('/profile', { preHandler: [server.authenticate] }, profileHandler);

//   // // Catch-all route for SPA
//   // server.get('*', (request, reply) => {
//   //   reply.sendFile('index.html');
//   // });
//   server.setNotFoundHandler((request, reply) => {
//     // Only handle GET requests for HTML pages
//     if (request.method !== 'GET' || !request.headers.accept?.includes('text/html')) {
//       return reply.status(404).send({ error: 'Not Found' });
//     }
//     reply.sendFile('index.html');
//   });
// }
