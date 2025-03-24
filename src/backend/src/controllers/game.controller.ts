import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { gameManager } from '../game/GameManager';
import GameStats from '../models/game.stats';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../../@types/fastify';
import { getDb } from '../db.js';

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
async function createStateHash(state: any) {
  return crypto.createHash('md5').update(JSON.stringify(state)).digest('hex');
}

export async function createGame(request: FastifyRequest, reply: FastifyReply) {
  const gameId = gameManager.createGame();
  return { gameId, success: true };
}

export async function getGames(request: FastifyRequest, reply: FastifyReply) {
  const games = gameManager.getAllGames();
  return { games, success: true };
}

export async function getGameState(request: FastifyRequest<{ Params: GameParams }>, reply: FastifyReply) {
  const { id } = request.params;
  const game = gameManager.getGame(id);
  
  if (!game) {
    return reply.code(404).send({ error: 'Game not found', success: false });
  }
  
  const state = game.getState();
  const hash = await createStateHash(state);
  
  return { state, hash, success: true };
}

export async function pollGameState(request: FastifyRequest<{ Params: GameParams; Querystring: PollQuery }>, reply: FastifyReply) {
  const { id } = request.params;
  const { hash } = request.query;
  
  const game = gameManager.getGame(id);
  if (!game) {
    return reply.code(404).send({ error: 'Game not found', success: false });
  }
  
  const state = game.getState();
  const currentHash = await createStateHash(state);
  
  if (hash && hash === currentHash) {
    return reply.code(304).send();
  }
  
  gameManager.updateGameState(id);
  const updatedState = game.getState();
  const updatedHash = await createStateHash(updatedState);
  
  return { state: updatedState, hash: updatedHash, success: true };
}

export async function updateGameState(request: FastifyRequest<{ Params: GameParams }>, reply: FastifyReply) {
  const { id } = request.params;
  const success = gameManager.updateGameState(id);
  if (!success) {
    return reply.code(404).send({ error: 'Game not found', success: false });
  }
  const game = gameManager.getGame(id);
  return { state: game?.getState(), success: true };
}

export async function movePaddle(request: FastifyRequest<{ Params: GameParams; Body: MoveBody }>, reply: FastifyReply) {
  const { id } = request.params;
  const { side, direction } = request.body;
  
  if (!['left', 'right'].includes(side) || !['up', 'down'].includes(direction)) {
    return reply.code(400).send({ error: 'Invalid input parameters', success: false });
  }
  
  const success = gameManager.movePaddle(id, side, direction);
  if (!success) {
    return reply.code(404).send({ error: 'Game not found', success: false });
  }
  return { success: true };
}

export async function startGame(request: FastifyRequest<{ Params: GameParams }>, reply: FastifyReply) {
  const { id } = request.params;
  const success = gameManager.startGame(id);
  return success ? { success: true } : reply.code(404).send({ error: 'Game not found', success: false });
}

export async function pauseGame(request: FastifyRequest<{ Params: GameParams }>, reply: FastifyReply) {
  const { id } = request.params;
  const success = gameManager.pauseGame(id);
  return success ? { success: true } : reply.code(404).send({ error: 'Game not found', success: false });
}

export async function deleteGame(request: FastifyRequest<{ Params: GameParams }>, reply: FastifyReply) {
  const { id } = request.params;
  const success = gameManager.deleteGame(id);
  return success ? { success: true } : reply.code(404).send({ error: 'Game not found', success: false });
}

export async function resetGame(request: FastifyRequest<{ Params: GameParams }>, reply: FastifyReply) {
  const { id } = request.params;
  const success = gameManager.resetGame(id);
  return success ? { success: true } : reply.code(404).send({ error: 'Game not found', success: false });
}
// export async function recordMatch(request: FastifyRequest<{ Body: {
//     gameId: string;
//     userId: number;
//     userSide: 'left' | 'right';
//     leftScore: number;
//     rightScore: number;
//     winner: 'left' | 'right';
//   } }>, reply: FastifyReply)
// {  
//   const authRequest = request as AuthenticatedRequest;
//   try {
//     const db = await getDb();
//     if (authRequest.user.id !== request.body.userId) {
//       return reply.code(403).send({ success: false, message: 'You can only record your own matches' });
//     }
//     const game = gameManager.getGame(request.body.gameId);
//     if (!game || game.getState().status !== 'finished') {
//       return reply.code(400).send({ success: false, message: 'Invalid game state' });
//     }
//     await GameStats.recordGameResult(
//         db,
//         player1Id,
//         player2Id,
//         winnerId,
//         leftScore,
//         rightScore
//     );
//     return reply.send({ success: true, message: 'Match recorded successfully' });
//   } catch (error) {
//     console.error('Error recording match:', error);
//     return reply.status(500).send({ success: false, message: 'Error recording match' });
//   }
// }

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
