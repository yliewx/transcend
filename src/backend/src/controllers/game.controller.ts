import { FastifyRequest, FastifyReply } from 'fastify';
import { gameManager } from '../game/GameManager';
import GameStats from '../models/game.stats';
import { AuthenticatedRequest } from '../../@types/fastify';
import { getDb } from '../db.js';


export async function createGame(request: FastifyRequest, reply: FastifyReply) {
  const { mode } = request.body as { mode: 'local' | 'remote' };

  if (mode !== 'local' && mode !== 'remote') {
    return reply.status(400).send({
      success: false,
      message: 'Invalid game mode. Must be "local" or "remote".'
    });
  }

  const gameId = gameManager.createGame(mode, false);
  return { gameId, success: true };
}

export function getExistingGame(request: AuthenticatedRequest, reply: FastifyReply) {
  const playerId = request.user.id;
  const existingGame = gameManager.getPlayerSession(playerId);
  if (!existingGame) {
    return reply.status(200).send({
      hasExistingGame: false,
      message: 'No existing game found.'
    });
  }

  const { gameId, gameMode, state, isCreator, isTourMatch } = existingGame;
  return { hasExistingGame: true, gameId, gameMode, state, isCreator, isTourMatch };
}

export async function getGameStats(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const db = await getDb();
    const stats = await GameStats.getUserStats(db, authRequest.user.id);
    return reply.send({ success: true, stats });
  } catch (error) {
    console.error('Error fetching game stats:', error);
    return reply.status(400).send({ success: false, message: 'Failed to fetch game statistics' });
  }
}

export async function getLeaderboard(request: FastifyRequest, reply: FastifyReply) {
  try {
      const db = await getDb();
      const leaderboard = await GameStats.getLeaderboard(db);
      return reply.send({ success: true, leaderboard });
  } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return reply.status(400).send({ success: false, message: 'Failed to fetch leaderboard' });
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
    return reply.status(400).send({ success: false, message: 'Failed to fetch match history' });
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
    return reply.status(400).send({ success: false, message: 'Failed to fetch Elo history' });
  }
}
