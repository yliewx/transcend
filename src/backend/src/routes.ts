// routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registerUser } from './controllers/user.register';
import { profileHandler, updatePasswordHandler, updateProfileDataHandler, updateUserDataHandler } from './controllers/user.profile';
import fp from 'fastify-plugin';
import { AuthenticatedRequest } from '../@types/fastify';
import * as GameController from './controllers/game.controller';
import { 
  getFriends, 
  getPendingRequests, 
  searchUsers, 
  sendFriendRequest, 
  acceptFriendRequest, 
  declineFriendRequest, 
  cancelFriendRequest, 
  removeFriend 
} from './controllers/friend.controller'

// Game route interface types
interface GameParams {
  id: string;
}

interface PollQuery {
  hash?: string;
}

interface FriendRequestParams {
  id: string;
}


export default fp(async function setupRoutes(server: FastifyInstance) {
  // User registration
  server.post('/api/register', registerUser);

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

   // FRIEND ROUTES
  server.get('/api/friends', { preHandler: server.authenticate }, (request, reply) => {
    return getFriends(request as AuthenticatedRequest, reply);
  });
  
  server.get('/api/friends/pending', { preHandler: server.authenticate }, (request, reply) => {
    return getPendingRequests(request as AuthenticatedRequest, reply);
  });
  
  // server.get('/api/users/search', { preHandler: server.authenticate }, (request, reply) => {
  //   return searchUsers(request as AuthenticatedRequest, reply);
  // });

  server.get('/api/users/search', { 
    preHandler: server.authenticate,
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string' }
        }
      }
    } 
  }, (request, reply) => {
    return searchUsers(request as AuthenticatedRequest, reply);
  });
  
  server.post('/api/friends/request', { preHandler: server.authenticate }, (request, reply) => {
    return sendFriendRequest(request as AuthenticatedRequest, reply);
  });
  
  server.post<{ Params: FriendRequestParams }>('/api/friends/request/:id/accept', 
    { preHandler: server.authenticate }, 
    (request, reply) => {
      return acceptFriendRequest(request as AuthenticatedRequest, reply);
    }
  );
  
  server.post<{ Params: FriendRequestParams }>('/api/friends/request/:id/decline', 
    { preHandler: server.authenticate }, 
    (request, reply) => {
      return declineFriendRequest(request as AuthenticatedRequest, reply);
    }
  );
  
  server.post<{ Params: FriendRequestParams }>('/api/friends/request/:id/cancel', 
    { preHandler: server.authenticate }, 
    (request, reply) => {
      return cancelFriendRequest(request as AuthenticatedRequest, reply);
    }
  );
  
  server.delete<{ Params: FriendRequestParams }>('/api/friends/:id', 
    { preHandler: server.authenticate }, 
    (request, reply) => {
      return removeFriend(request as AuthenticatedRequest, reply);
    }
  );

  // GAME ROUTES
  // Create a new game
  server.post('/api/createGame', { preHandler: server.authenticate }, GameController.createGame);
  /*
  // Start game
  server.post<{ Params: GameParams }>('/api/games/:id/start', { preHandler: server.authenticate }, GameController.startGame);

  // Pause/Resume game
  server.post<{ Params: GameParams }>('/api/games/:id/pause', GameController.pauseGame);

  // Delete game
  server.delete<{ Params: GameParams }>('/api/games/:id', { preHandler: server.authenticate }, GameController.deleteGame);
  
  // Polling
  server.post<{ Params: GameParams, Querystring: PollQuery, Body?: { input?: any } }>(
    '/api/games/:id/poll', 
    GameController.pollGameState
  );
 */

  // STAT ROUTES 
  server.post('/api/games/record-match', { preHandler: server.authenticate }, GameController.recordMatch);

  server.get('/api/user/match-history', { preHandler: server.authenticate }, GameController.getMatchHistory);
  
  server.get('/api/user/game-stats', { preHandler: server.authenticate }, GameController.getGameStats);

  server.get('/api/user/leaderboard', { preHandler: server.authenticate }, GameController.getLeaderboard);
  
 

  // Catch-all route for SPA
  server.setNotFoundHandler((request, reply) => {
    // Only handle GET requests for HTML pages
    if (request.method !== 'GET' || !request.headers.accept?.includes('text/html')) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    reply.sendFile('index.html');
  });
});
