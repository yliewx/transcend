import { FastifyInstance } from 'fastify';
import { registerUser } from './controllers/user.register';
import { loginHandler, logoutHandler, verifyOtp, otpPreferenceHandler, generateOtp } from './controllers/auth.controller';
import { profileHandler, updatePasswordHandler, updateProfileDataHandler, updateUserDataHandler } from './controllers/user.profile';
import fp from 'fastify-plugin';
import { AuthenticatedRequest } from '../@types/fastify';

export default fp(async function setupRoutes(server: FastifyInstance) {
  // User registration
  server.post('/api/register', registerUser);

  // Authentication routes
  server.post('/api/login', loginHandler);
  server.post('/api/logout', logoutHandler);
  server.post('/api/otp/preferences', { preHandler: server.preAuthenticate }, otpPreferenceHandler);
  server.post('/api/otp/generate', { preHandler: server.preAuthenticate }, generateOtp);
  server.post('/api/otp/verify', { preHandler: server.preAuthenticate }, verifyOtp);

  // User routes
  server.get('/api/profile', { preHandler: server.authenticate }, (request, reply) => {
    return profileHandler(request as AuthenticatedRequest, reply);
  });
  server.put('/api/profile/update', { preHandler: server.authenticate }, (request, reply) => {
    return updateProfileDataHandler(request as AuthenticatedRequest, reply);
  });
  server.put('/api/user/update', { preHandler: server.authenticate }, (request, reply) => {
    return updateUserDataHandler(request as AuthenticatedRequest, reply);
  })
  server.put('/api/user/password', { preHandler: server.authenticate }, (request, reply) => {
    console.log('Password update route hit');

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
