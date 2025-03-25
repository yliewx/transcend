// routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registerUser } from './controllers/user.register';
import { loginHandler, logoutHandler, verifyOtp, otpPreferenceHandler, generateOtp } from './controllers/auth.controller';
import { profileHandler, updatePasswordHandler, updateProfileDataHandler, updateUserDataHandler } from './controllers/user.profile';
import fp from 'fastify-plugin';
import { AuthenticatedRequest } from '../@types/fastify';
import * as GameController from './controllers/game.controller';

// Game route interface types
interface GameParams {
  id: string;
}

interface MoveBody {
  side: 'left' | 'right';
  direction: 'up' | 'down';
}

interface PollQuery {
  hash?: string;
}

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
  });
  server.put('/api/user/password', { preHandler: server.authenticate }, (request, reply) => {
    console.log('Password update route hit');
    return updatePasswordHandler(request as AuthenticatedRequest, reply);
  });

  // GAME ROUTES
  // Create a new game
  server.post('/api/games', { preHandler: server.authenticate }, GameController.createGame);

  // Get all games
  server.get('/api/games', { preHandler: server.authenticate }, GameController.getGames);

  // Get specific game state
  server.get<{ Params: GameParams }>('/api/games/:id', GameController.getGameState);

  // Efficient polling endpoint with conditional response
  server.get<{ Params: GameParams, Querystring: PollQuery }>('/api/games/:id/poll', GameController.pollGameState);

  // Update game state (server-side game loop)
  server.post<{ Params: GameParams }>('/api/games/:id/update', GameController.updateGameState);

  // Move paddle
  server.post<{ Params: GameParams, Body: MoveBody }>('/api/games/:id/move', GameController.movePaddle);

  // Start game
  server.post<{ Params: GameParams }>('/api/games/:id/start', { preHandler: server.authenticate }, GameController.startGame);

  // Pause/Resume game
  server.post<{ Params: GameParams }>('/api/games/:id/pause', GameController.pauseGame);

  // Reset game
  server.post<{ Params: GameParams }>('/api/games/:id/reset', { preHandler: server.authenticate }, GameController.resetGame);

  // Delete game
  server.delete<{ Params: GameParams }>('/api/games/:id', { preHandler: server.authenticate }, GameController.deleteGame);


  // STAT ROUTES 
  server.post('/api/games/record-match', { preHandler: server.authenticate }, GameController.recordMatch);

  server.get('/api/user/match-history', { preHandler: server.authenticate }, GameController.getMatchHistory);
  
  server.get('/api/user/game-stats', { preHandler: server.authenticate }, GameController.getGameStats);


  // Catch-all route for SPA
  server.setNotFoundHandler((request, reply) => {
    // Only handle GET requests for HTML pages
    if (request.method !== 'GET' || !request.headers.accept?.includes('text/html')) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    reply.sendFile('index.html');
  });
});
