import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { gameManager } from '../game/GameManager';
import GameStats from '../models/game.stats';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../../@types/fastify';
import { getDb } from '../db.js';

interface GameParams {
  id: string;
}

interface PollQuery {
  hash?: string;
}

// Helper function to create state hash for efficient polling
async function createStateHash(state: any) {
  return crypto.createHash('md5').update(JSON.stringify(state)).digest('hex');
}

export async function createGame(request: FastifyRequest, reply: FastifyReply) {
  // Extract game mode from request body
  const { mode } = request.body as { mode: 'local' | 'remote' };

  // Check if game mode is valid
  if (mode !== 'local' && mode !== 'remote') {
    return reply.status(400).send({
      success: false,
      message: 'Invalid game mode. Must be "local" or "remote".'
    });
  }

  const gameId = gameManager.createGame(mode);
  return { gameId, success: true };
}
/*
export async function startGame(request: FastifyRequest<{ Params: GameParams }>, reply: FastifyReply) {
  const { id } = request.params;
  const success = gameManager.startGame(id);
  return success ? { success: true } : reply.code(404).send({ error: 'Game not found', success: false });
}

export async function pauseGame(request: FastifyRequest<{ Params: GameParams }>, reply: FastifyReply) {
  const { id } = request.params;
  const game = gameManager.getGame(id);
  
  if (!game) {
    return reply.code(404).send({ error: 'Game not found', success: false });
  }
  
  game.pauseGame();
  const state = game.getState();
  
  return { 
    success: true, 
    status: state.status // Return the new status after toggling
  };
}

export async function deleteGame(request: FastifyRequest<{ Params: GameParams }>, reply: FastifyReply) {
  const { id } = request.params;
  const success = gameManager.deleteGame(id);
  return success ? { success: true } : reply.code(404).send({ error: 'Game not found', success: false });
}

export async function pollGameState(
  request: FastifyRequest<{
    Params: GameParams;
    Querystring: PollQuery;
    Body?: { input?: any }
  }>, 
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { hash } = request.query;
    
    console.log(`pollGameState called for game ID: ${id}`);
    
    const game = gameManager.getGame(id);
    if (!game) {
      return reply.code(404).send({ error: 'Game not found', success: false });
    }

    // Process input if provided
    if (request.body?.input) {
      console.log(`Processing input for game ${id}:`, request.body.input);
      gameManager.updatePaddleInput(id, request.body.input);
    }

    const gameState = game.getState();
    const currentHash = await createStateHash(gameState);

    // If hash matches, no change in state
    if (hash && hash === currentHash) {
      return reply.code(304).send();
    } 
    
    // Make sure gameState is serializable without nesting JSON operations
    const safeGameState = JSON.parse(JSON.stringify(gameState));
    
    // Return the state and include the new hash for the next poll
    return reply.code(200).send({ 
      success: true,
      state: safeGameState,
      hash: currentHash
    });
  } catch (error) {
    console.error('Error in pollGameState:', error);
    return reply.code(500).send({ 
      error: 'Internal Server Error', 
      success: false
    });
  }
}
*/
export async function recordMatch(request: FastifyRequest, reply: FastifyReply)
{
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
}


export async function getMatchHistory(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const db = await getDb();
    const matchHistory = await GameStats.getUserMatchHistory(db, authRequest.user.id);
    return reply.send({ success: true, matchHistory });
  } catch (error) {
    console.error('Error fetching match history:', error);
    return reply.status(500).send({ success: false, message: 'Failed to fetch match history' });
  }
}

export async function getGameStats(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const db = await getDb();
    const stats = await GameStats.getUserStats(db, authRequest.user.id);
    return reply.send({ success: true, stats });
  } catch (error) {
    console.error('Error fetching game stats:', error);
    return reply.status(500).send({ success: false, message: 'Failed to fetch game statistics' });
  }
}
