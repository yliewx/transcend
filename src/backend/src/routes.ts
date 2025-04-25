// routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply, RouteHandlerMethod, RouteShorthandOptions } from 'fastify';
import { registerUser } from './controllers/user.register';
import { profileHandler, updatePasswordHandler, updateProfileDataHandler, updateUserDataHandler, uploadAvatarHandler } from './controllers/user.profile';
import fp from 'fastify-plugin';
import { AuthenticatedRequest } from '../@types/fastify';
import * as GameController from './controllers/game.controller';
import * as FriendController from './controllers/friend.controller'
import * as TournamentController from './controllers/tour.controller';

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

// Helper function to define authenticated routes
// function defineAuthRoute<T = any>(
//   server: FastifyInstance,
//   method: 'get' | 'post' | 'put' | 'delete',
//   url: string,
//   handler: (request: AuthenticatedRequest, reply: FastifyReply) => Promise<any>,
//   options: RouteShorthandOptions = {}
// ) {
//   const opts = { ...options, preHandler: server.authenticate };
  
//   // The type error occurs here. The wrapped handler needs to be properly typed
//   // to return a Promise
//   const wrappedHandler: RouteHandlerMethod = async (req, reply) => {
//     // Await the handler result to ensure we return a Promise
//     return await handler(req as AuthenticatedRequest, reply);
//   };
  
//   server[method](url, opts, wrappedHandler);
// }

function defineAuthRoute<T = any>(
  server: FastifyInstance,
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  handler: (request: AuthenticatedRequest, reply: FastifyReply) => Promise<any>,
  options: RouteShorthandOptions = {}
) {
  const opts = { ...options, preHandler: server.authenticate };
  
  // The wrapped handler now uses explicit type assertion
  const wrappedHandler: RouteHandlerMethod = async (req, reply) => {
    // Use 'as unknown as' to safely convert between the types
    return await handler(req as unknown as AuthenticatedRequest, reply);
  };
  
  server[method](url, opts, wrappedHandler);
}

export default fp(async function setupRoutes(server: FastifyInstance) {
  // User registration (no auth needed)
  server.post('/api/register', registerUser);

  // User routes
  defineAuthRoute(server, 'get', '/api/profile', profileHandler);
  defineAuthRoute(server, 'put', '/api/profile/update', updateProfileDataHandler);
  defineAuthRoute(server, 'put', '/api/user/update', updateUserDataHandler);
  defineAuthRoute(server, 'put', '/api/user/password', updatePasswordHandler);
  defineAuthRoute(server, 'post', '/api/profile/avatar', uploadAvatarHandler);
  
  // FRIEND ROUTES
  defineAuthRoute(server, 'get', '/api/friends', FriendController.getFriends);
  defineAuthRoute(server, 'get', '/api/friends/pending', FriendController.getPendingRequests);
  
  // Search users with schema
  defineAuthRoute(server, 'get', '/api/users/search', FriendController.searchUsers, {
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string' }
        }
      }
    }
  });
  
  defineAuthRoute(server, 'post', '/api/friends/request', FriendController.sendFriendRequest);
  
  // Routes with params
  defineAuthRoute(server, 'post', '/api/friends/request/:id/accept', FriendController.acceptFriendRequest);
  defineAuthRoute(server, 'post', '/api/friends/request/:id/decline', FriendController.declineFriendRequest);
  defineAuthRoute(server, 'post', '/api/friends/request/:id/cancel', FriendController.cancelFriendRequest);
  defineAuthRoute(server, 'delete', '/api/friends/:id', FriendController.removeFriend);

  // GAME ROUTES
  //defineAuthRoute(server, 'post', '/api/game/create', GameController.createGame);
  //defineAuthRoute(server, 'get', '/api/game/restore', GameController.getExistingGame);
  // server.get('/api/game/restore', { preHandler: server.authenticate }, (request, reply) => {
  //   return GameController.getExistingGame(request as AuthenticatedRequest, reply);
  // });
  server.post('/api/game/create', { preHandler: server.authenticateGame }, (request, reply) => {
    // Use the same type assertion pattern
    return GameController.createGame(request as unknown as AuthenticatedRequest, reply);
  });
  server.get('/api/game/restore', { preHandler: server.authenticate }, (request, reply) => {
    // Use the same type assertion pattern
    return GameController.getExistingGame(request as unknown as AuthenticatedRequest, reply);
  });
  
  // STAT ROUTES
  defineAuthRoute(server, 'get', '/api/user/match-history', GameController.getMatchHistory);
  defineAuthRoute(server, 'get', '/api/user/game-stats', GameController.getGameStats);
  defineAuthRoute(server, 'get', '/api/user/leaderboard', GameController.getLeaderboard);

  // Tournament routes
  defineAuthRoute(server, 'get', '/api/tournaments', TournamentController.getTournaments);
  defineAuthRoute(server, 'get', '/api/tournaments/:id', TournamentController.getTournamentDetails);
  //defineAuthRoute(server, 'post', '/api/tournaments/:id/register', TournamentController.registerForTournament);
  defineAuthRoute(server, 'post', '/api/tournaments/:id/register', TournamentController.registerForTournament, {
    schema: {
      body: {
        type: 'object',
        required: ['alias'],
        properties: {
          alias: { type: 'string', minLength: 1 }
        }
      }
    }
  });
  defineAuthRoute(server, 'get', '/api/user/tournaments', TournamentController.getUserTournaments);
  defineAuthRoute(server, 'post', '/api/tournaments/matches/:id/join', TournamentController.joinTournamentMatch);

  // Admin routes
  defineAuthRoute(server, 'post', '/api/admin/tournaments', TournamentController.createTournament);

  // Catch-all route for SPA
  server.setNotFoundHandler((request, reply) => {
    // Only handle GET requests for HTML pages
    if (request.method !== 'GET' || !request.headers.accept?.includes('text/html')) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    reply.sendFile('index.html');
  });
});