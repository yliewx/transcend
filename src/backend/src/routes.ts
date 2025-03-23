// routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registerUser } from './controllers/user.register';
import { loginHandler, logoutHandler, verifyOtp, otpPreferenceHandler, generateOtp } from './controllers/auth.controller';
import { profileHandler, updatePasswordHandler, updateProfileDataHandler, updateUserDataHandler } from './controllers/user.profile';
import fp from 'fastify-plugin';
import { AuthenticatedRequest } from '../@types/fastify';
import { gameManager } from './game/GameManager';
import crypto from 'crypto';
import GameStats from './models/game.stats';
import { getDb } from './db.js';


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

// Helper function to create state hash for efficient polling
function createStateHash(state: any): string {
  return crypto.createHash('md5').update(JSON.stringify(state)).digest('hex');
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
  server.post('/api/games', async (request: FastifyRequest, reply: FastifyReply) => {
    const gameId = gameManager.createGame();
    return { gameId, success: true };
  });

  // Get all games
  server.get('/api/games', async (request: FastifyRequest, reply: FastifyReply) => {
    const games = gameManager.getAllGames();
    return { games, success: true };
  });

  // Get specific game state
  server.get<{ Params: GameParams }>('/api/games/:id', async (request, reply) => {
    const { id } = request.params;
    const game = gameManager.getGame(id);
    
    if (!game) {
      return reply.code(404).send({ error: 'Game not found', success: false });
    }
    
    const state = game.getState();
    const hash = createStateHash(state);
    
    return { state, hash, success: true };
  });

  // Efficient polling endpoint with conditional response
  server.get<{ Params: GameParams, Querystring: PollQuery }>('/api/games/:id/poll', async (request, reply) => {
    const { id } = request.params;
    const { hash } = request.query;
    
    const game = gameManager.getGame(id);
    
    if (!game) {
      return reply.code(404).send({ error: 'Game not found', success: false });
    }
    
    const state = game.getState();
    const currentHash = createStateHash(state);
    
    // If client has current state (hashes match), return 304 Not Modified
    if (hash && hash === currentHash) {
      return reply.code(304).send();
    }
    
    // Otherwise update the game state and return new state
    gameManager.updateGameState(id);
    const updatedState = game.getState();
    const updatedHash = createStateHash(updatedState);
    
    return { state: updatedState, hash: updatedHash, success: true };
  });

  // Update game state (server-side game loop)
  server.post<{ Params: GameParams }>('/api/games/:id/update', async (request, reply) => {
    const { id } = request.params;
    const success = gameManager.updateGameState(id);
    
    if (!success) {
      return reply.code(404).send({ error: 'Game not found', success: false });
    }
    
    const game = gameManager.getGame(id);
    const state = game?.getState();
    
    return { state, success: true };
  });

  // Move paddle
  server.post<{ Params: GameParams, Body: MoveBody }>('/api/games/:id/move', async (request, reply) => {
    const { id } = request.params;
    const { side, direction } = request.body;
    
    if (!side || !direction || !['left', 'right'].includes(side) || !['up', 'down'].includes(direction)) {
      return reply.code(400).send({ error: 'Invalid input parameters', success: false });
    }
    
    const success = gameManager.movePaddle(id, side, direction);
    
    if (!success) {
      return reply.code(404).send({ error: 'Game not found', success: false });
    }
    
    return { success: true };
  });

  // Start game
  server.post<{ Params: GameParams }>('/api/games/:id/start', async (request, reply) => {
    const { id } = request.params;
    const success = gameManager.startGame(id);
    
    if (!success) {
      return reply.code(404).send({ error: 'Game not found', success: false });
    }
    
    return { success: true };
  });

  // Pause/Resume game
  server.post<{ Params: GameParams }>('/api/games/:id/pause', async (request, reply) => {
    const { id } = request.params;
    const success = gameManager.pauseGame(id);
    
    if (!success) {
      return reply.code(404).send({ error: 'Game not found', success: false });
    }
    
    return { success: true };
  });

  // Reset game
  server.post<{ Params: GameParams }>('/api/games/:id/reset', async (request, reply) => {
    const { id } = request.params;
    const success = gameManager.resetGame(id);
    
    if (!success) {
      return reply.code(404).send({ error: 'Game not found', success: false });
    }
    
    return { success: true };
  });

  // Delete game
  server.delete<{ Params: GameParams }>('/api/games/:id', async (request, reply) => {
    const { id } = request.params;
    const success = gameManager.deleteGame(id);
    
    if (!success) {
      return reply.code(404).send({ error: 'Game not found', success: false });
    }
    
    return { success: true };
  });


  /*
  // Add a new route to record a local match
  server.post('/api/games/record-match', { 
    preHandler: server.authenticate 
  }, async (request, reply) => {
    const { gameId, userId, userSide, leftScore, rightScore, winner } = request.body as {
      gameId: string;
      userId: number;
      userSide: 'left' | 'right';
      leftScore: number;
      rightScore: number;
      winner: 'left' | 'right';
    };
    
    // Cast request to AuthenticatedRequest to access user property
    const authRequest = request as AuthenticatedRequest;
    
    try {
      // Get database connection
      const db = await getDb();
      
      // Verify that the authenticated user is the one recording the match
      if (authRequest.user.id !== userId) {
        return reply.code(403).send({
          success: false,
          message: 'You can only record your own matches'
        });
      }
      
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
      
      // Record the match using your database connection
      await GameStats.recordGameResult(
        db,
        player1Id,
        player2Id,
        winnerId,
        leftScore,
        rightScore
      );
      
      return reply.send({
        success: true,
        message: 'Match recorded successfully'
      });
    } catch (error) {
      console.error('Error recording match:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error recording match'
      });
    }
  });

  server.get('/api/user/match-history', { 
    preHandler: server.authenticate 
  }, async (request, reply) => {
    try {
      // Cast request to AuthenticatedRequest to access user property
      const authRequest = request as AuthenticatedRequest;
      const userId = authRequest.user.id;
      
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

  server.get('/api/user/game-stats', { 
    preHandler: server.authenticate 
  }, async (request, reply) => {
    try {
      // Cast request to AuthenticatedRequest to access user property
      const authRequest = request as AuthenticatedRequest;
      const userId = authRequest.user.id;
      
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

  
  // Catch-all route for SPA
  server.setNotFoundHandler((request, reply) => {
    // Only handle GET requests for HTML pages
    if (request.method !== 'GET' || !request.headers.accept?.includes('text/html')) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    reply.sendFile('index.html');
  });
});