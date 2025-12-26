import { FastifyRequest, FastifyReply } from 'fastify';
import { gameManager } from '../game/GameManager';
import GameStats from '../models/game.stats';
import { AuthenticatedRequest } from '../../@types/fastify';
import { getDb } from '../db.js';
import { Database } from 'sqlite';
import Tournament from '../models/tournament';


export async function createGame(request: FastifyRequest, reply: FastifyReply) {
  const { mode } = request.body as { mode: 'local' | 'remote' };

  if (mode !== 'local' && mode !== 'remote') {
    return reply.status(400).send({
      success: false,
      message: 'Invalid game mode. Must be "local" or "remote".'
    });
  }

  const gameId = await gameManager.createGame(mode, null);
  if (!gameId) {
    return reply.status(400).send({
      success: false,
      message: 'Failed to create game room.'
    });
  }

  return reply.status(200).send({
    gameId: gameId,
    success: true
  });
}

export async function getUserParticipantIdInMatch(db: Database, match: any, userId: string): Promise<number | null> {
  const participantIds = [match.player1_participant_id, match.player2_participant_id];
  
  for (const participantId of participantIds) {
    if (participantId) {
      const participant = await Tournament.getParticipantById(db, participantId);
      if (participant) {
        if (participant.user_id === userId) {
          return participantId;
        }
                
        if (match.tournament_mode === 'local' && participant.is_guest && participant.host_id) {
          const host = await Tournament.getParticipantById(db, participant.host_id);
          if (host && host.user_id === userId) {
            return participantId;
          }
        }
      }
    }
  }
  
  return null;
}


export async function getExistingGame(request: AuthenticatedRequest, reply: FastifyReply) {
  const userId = request.user.id;
  const db = await getDb();

  const existingGameSession = gameManager.getPlayerSession(userId);

  if (!existingGameSession) {
    return reply.status(200).send({
      hasExistingGame: false,
      message: 'No existing game found.'
    });
  }

  const { gameId, gameMode, state, isCreator, isTourMatch } = existingGameSession;
  let participantId: number | undefined;

  if (isTourMatch) {
    try {
      const match = await Tournament.findMatchByGameId(db, gameId);
      if (match) {
        const foundParticipantId = await getUserParticipantIdInMatch(db, match, userId);
        participantId = foundParticipantId || undefined;
      }
    } catch (error) {
      console.error("Error determining participantId for existing tournament game session:", error);
    }
  }

  return reply.status(200).send({
    hasExistingGame: true,
    gameId,
    gameMode,
    state,
    isCreator,
    isTourMatch,
    participantId
  });
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
