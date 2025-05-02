import { FastifyInstance, FastifyRequest, FastifyReply, RouteHandlerMethod, RouteShorthandOptions } from 'fastify';
import fp from 'fastify-plugin';
import { registerUser } from './controllers/user.register';
import * as UserController from './controllers/user.profile';
import { AuthenticatedRequest } from '../@types/fastify';
import * as GameController from './controllers/game.controller';
import * as FriendController from './controllers/friend.controller'
import * as TournamentController from './controllers/tour.controller';

function defineAuthRoute<T = any>(
  server: FastifyInstance,
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  handler: (request: AuthenticatedRequest, reply: FastifyReply) => Promise<any>,
  options: RouteShorthandOptions = {}
) {
  const opts = { ...options, preHandler: server.authenticate };
  
  const wrappedHandler: RouteHandlerMethod = async (req, reply) => {
    return await handler(req as unknown as AuthenticatedRequest, reply);
  };
  
  server[method](url, opts, wrappedHandler);
}

export default fp(async function setupRoutes(server: FastifyInstance) {
  server.post('/api/register', registerUser);
  defineAuthRoute(server, 'get', '/api/profile', UserController.profileHandler);
  defineAuthRoute(server, 'put', '/api/profile/update', UserController.updateProfileDataHandler);
  defineAuthRoute(server, 'put', '/api/user/update', UserController.updateUserDataHandler);
  defineAuthRoute(server, 'put', '/api/user/password', UserController.updatePasswordHandler);
  defineAuthRoute(server, 'post', '/api/profile/avatar', UserController.uploadAvatarHandler);
  defineAuthRoute(server, 'get', '/api/profile/avatar', UserController.getAvatarHandler);
  defineAuthRoute(server, 'get', '/api/friends', FriendController.getFriends);
  defineAuthRoute(server, 'get', '/api/friends/pending', FriendController.getPendingRequests);
  defineAuthRoute(server, 'get', '/api/users/search', FriendController.searchUsers);
  defineAuthRoute(server, 'post', '/api/friends/request', FriendController.sendFriendRequest);  
  defineAuthRoute(server, 'post', '/api/friends/request/:id/accept', FriendController.acceptFriendRequest);
  defineAuthRoute(server, 'post', '/api/friends/request/:id/decline', FriendController.declineFriendRequest);
  defineAuthRoute(server, 'post', '/api/friends/request/:id/cancel', FriendController.cancelFriendRequest);
  defineAuthRoute(server, 'delete', '/api/friends/:id', FriendController.removeFriend);
  server.post('/api/game/create', { preHandler: server.authenticateGame }, (request, reply) => {
    return GameController.createGame(request as unknown as AuthenticatedRequest, reply);
  });
  server.get('/api/game/restore', { preHandler: server.authenticate }, (request, reply) => {
    return GameController.getExistingGame(request as unknown as AuthenticatedRequest, reply);
  });  
  defineAuthRoute(server, 'get', '/api/user/match-history', GameController.getMatchHistory);
  defineAuthRoute(server, 'get', '/api/user/game-stats', GameController.getGameStats);
  defineAuthRoute(server, 'get', '/api/user/leaderboard', GameController.getLeaderboard);
  defineAuthRoute(server, 'get', '/api/user/elo-history', GameController.getUserEloHistory);
  defineAuthRoute(server, 'get', '/api/tournaments', TournamentController.getTournaments);
  defineAuthRoute(server, 'get', '/api/tournaments/:id', TournamentController.getTournamentDetails);
  defineAuthRoute(server, 'post', '/api/tournaments/:id/register', TournamentController.registerForTournament);
  defineAuthRoute(server, 'get', '/api/user/tournaments', TournamentController.getUserTournaments);
  defineAuthRoute(server, 'post', '/api/tournaments/matches/:id/join', TournamentController.joinTournamentMatch);
  defineAuthRoute(server, 'post', '/api/admin/tournaments', TournamentController.createTournament);

  server.setNotFoundHandler((request, reply) => {
    if (request.method !== 'GET' || !request.headers.accept?.includes('text/html')) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    reply.sendFile('index.html');
  });
});