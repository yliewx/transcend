import { FastifyInstance } from 'fastify';
import { registerUser, updateUserDataHandler, updatePasswordHandler } from './controllers/user.register';
import { loginHandler, logoutHandler, profileHandler, updateProfileDataHandler } from './controllers/auth.controller';
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
    return profileHandler(request as AuthenticatedRequest, reply);
  });
  server.put('/profile/update', { preHandler: server.authenticate }, (request, reply) => {
    return updateProfileDataHandler(request as AuthenticatedRequest, reply);
  });
  server.put('/user/update', { preHandler: server.authenticate }, (request, reply) => {
    return updateUserDataHandler(request as AuthenticatedRequest, reply);
  })
  server.put('/user/password', { preHandler: server.authenticate }, (request, reply) => {
    return updatePasswordHandler(request as AuthenticatedRequest, reply);
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

