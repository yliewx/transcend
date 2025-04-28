import { FastifyRequest, FastifyReply } from 'fastify';
import { gameManager } from '../game/GameManager';
import GameStats from '../models/game.stats';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../../@types/fastify';
import { getDb } from '../db.js';

// interface GameParams {
//   id: string;
// }

// interface PollQuery {
//   hash?: string;
// }

// // Helper function to create state hash for efficient polling
// async function createStateHash(state: any) {
//   return crypto.createHash('md5').update(JSON.stringify(state)).digest('hex');
// }

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

  const gameId = gameManager.createGame(mode, false);
  return { gameId, success: true };
}

// Retrieve game ID if player is in an active game
export function getExistingGame(request: AuthenticatedRequest, reply: FastifyReply) {
  const playerId = request.user.id;
  const existingGame = gameManager.getPlayerSession(playerId);
  if (!existingGame) {
    return reply.status(200).send({
      hasExistingGame: false,
      message: 'No existing game found.'
    });
  }

  const { gameId, gameMode, state, isCreator } = existingGame;
  return { hasExistingGame: true, gameId, gameMode, state, isCreator };
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
/*
export async function recordMatch(request: FastifyRequest, reply: FastifyReply)
{
  const { gameId, userId, opponentId, winnerId, leftScore, rightScore } = request.body as {
      gameId: string;
      userId: number;
      opponentId: number;
      winnerId: number;
      leftScore: number;
      rightScore: number;
  };
  
  // Cast request to AuthenticatedRequest to access user property
  const authRequest = request as AuthenticatedRequest;
  let transactionStarted = false;
  const db = await getDb();

  try {
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
    await db.run('BEGIN TRANSACTION');
    transactionStarted = true;
    await GameStats.recordGameResult(db, userId, opponentId, winnerId, leftScore, rightScore)
    const result : 'win' | 'loss' = winnerId === userId ? 'win' : 'loss';
    await GameStats.updateMatches(db, userId, result);
    if (opponentId !== null) 
        await GameStats.updatePlayerElo(db, userId, opponentId, winnerId === userId ? 1 : 0);
    await GameStats.updateWinStreak(db, userId, winnerId === userId)
    await db.run('COMMIT');
    return reply.send({
        success: true,
        message: 'Match recorded successfully'
    });
  } catch (error) {
    if (transactionStarted) 
      await db.run('ROLLBACK'); 
    console.error('Error recording match:', error);
    return reply.status(500).send({
        success: false,
        message: 'Error recording match'
    });
  }
}
*/
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

export async function getLeaderboard(request: FastifyRequest, reply: FastifyReply) {
  try {
      const db = await getDb();
      const leaderboard = await GameStats.getLeaderboard(db);
      return reply.send({ success: true, leaderboard });
  } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return reply.status(500).send({ success: false, message: 'Failed to fetch leaderboard' });
  }
}

export async function getMatchHistory(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const db = await getDb();
    const matchHistory = await GameStats.getUserMatchHistory(db, authRequest.user.id);
    //const matchHistory = await GameStats.getUserMatchHistory(db, request.user.id);
    return reply.send({ success: true, matchHistory });
  } catch (error) {
    console.error('Error fetching match history:', error);
    return reply.status(500).send({ success: false, message: 'Failed to fetch match history' });
  }
}

export async function getUserEloHistory(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const db = await getDb();
    const eloHistory = await GameStats.getUserEloHistory(db, authRequest.user.id);
    return reply.send({ success: true, eloHistory });
  } catch (error) {
    console.error('Error fetching Elo history:', error);
    return reply.status(500).send({ success: false, message: 'Failed to fetch Elo history' });
  }
}
