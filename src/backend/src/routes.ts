// routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registerUser } from './controllers/user.register';
import { loginHandler, logoutHandler, verifyOtp, otpPreferenceHandler, generateOtp } from './controllers/auth.controller';
import { profileHandler, updatePasswordHandler, updateProfileDataHandler, updateUserDataHandler } from './controllers/user.profile';
import fp from 'fastify-plugin';
import { AuthenticatedRequest } from '../@types/fastify';
import crypto from 'crypto';
import GameStats from './models/game.stats';
import { getDb } from './db.js';
// import { createGame, getGames, getGameState, pollGameState, updateGameState, movePaddle, startGame, pauseGame, deleteGame, resetGame,  getMatchHistory,  recordMatch} from './controllers/game.controller';
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

  // GAME ROUTES - Integrated directly
  
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


  
  // Add a new route to record a local match
  server.post('/api/games/record-match', { preHandler: server.authenticate }, GameController.recordMatch);

  server.get('/api/user/match-history', { preHandler: server.authenticate }, GameController.getMatchHistory);
  
  server.get('/api/user/game-stats', { preHandler: server.authenticate }, GameController.getGameStats);


  /*
  server.post('/api/games/record-match', async (request, reply) => {
    const { gameId, userId, userSide, leftScore, rightScore, winner } = request.body as {
      gameId: string;
      userId: number;
      userSide: 'left' | 'right';
      leftScore: number;
      rightScore: number;
      winner: 'left' | 'right';
    };
    
    try {
      // Get database connection
      const db = await getDb();
      
      // Verify the game exists and has ended
      const game = gameManager.getGame(gameId);
      if (!game) {
        return reply.code(404).send({
          success: false,
          message: 'Game not found'
        });
      }
      
      const gameState = game.getState();
      if (gameState.status !== 'finished') {
        return reply.code(400).send({
          success: false,
          message: 'Cannot record match for a game that has not finished'
        });
      }
      
      // For local games, use null for the second player
      const player1Id = userSide === 'left' ? userId : null;
      const player2Id = userSide === 'left' ? null : userId;
      
      // Determine the winner ID
      const userWon = (userSide === 'left' && winner === 'left') || 
                      (userSide === 'right' && winner === 'right');
      const winnerId = userWon ? userId : null;

      console.log("Request body:", request.body);
      console.log("Game state:", gameState);
      
      // Record the match using your database connection
      const result = await GameStats.recordGameResult(
        db,
        player1Id,
        player2Id,
        winnerId,
        leftScore,
        rightScore
      );
      console.log("DB result:", result);

      return reply.send({
        success: true,
        message: 'Match recorded successfully'
      });
    } catch (error) {
      const err = error as Error;
      console.error('Error recording match:', err);
      console.error('Error details:', err.stack);
      
      return reply.status(500).send({
        success: false,
        message: 'Error recording match'
      });
    }
  });

  // Define the interface for query parameters
  interface MatchHistoryQuery {
    userId: string;
  }

  // Update your endpoint with the correct type
  server.get<{
    Querystring: MatchHistoryQuery
  }>('/api/user/match-history', async (request, reply) => {
    try {
      // Now TypeScript will recognize the query property
      const userId = parseInt(request.query.userId, 10);
      
      if (isNaN(userId)) {
        return reply.code(400).send({
          success: false,
          message: 'Valid userId is required as a query parameter'
        });
      }
      
      // Get database connection
      const db = await getDb();
      
      const matchHistory = await GameStats.getUserMatchHistory(db, userId);
      
      return reply.send({
        success: true,
        matchHistory
      });
    } catch (error) {
      console.error('Error fetching match history:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to fetch match history'
      });
    }
  });
    
  server.get<{
    Querystring: MatchHistoryQuery
  }>('/api/user/game-stats', async (request, reply) => {
    try {
      // Get userId from query parameter instead of authentication
      const userId = parseInt(request.query.userId as string, 10);
      
      if (isNaN(userId)) {
        return reply.code(400).send({
          success: false,
          message: 'Valid userId is required as a query parameter'
        });
      }
      
      // Get database connection
      const db = await getDb();
      
      const stats = await GameStats.getUserStats(db, userId);
      
      return reply.send({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Error fetching game stats:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to fetch game statistics'
      });
    }
  });
*/
  
  // Catch-all route for SPA
  server.setNotFoundHandler((request, reply) => {
    // Only handle GET requests for HTML pages
    if (request.method !== 'GET' || !request.headers.accept?.includes('text/html')) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    reply.sendFile('index.html');
  });
});
