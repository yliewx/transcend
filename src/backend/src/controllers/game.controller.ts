import { FastifyRequest, FastifyReply } from 'fastify';
import { gameManager } from '../game/GameManager';
import GameStats from '../models/game.stats';
import { AuthenticatedRequest } from '../../@types/fastify';
import { getDb } from '../db.js';
import Tournament from '../models/tournament';


export async function createGame(request: FastifyRequest, reply: FastifyReply) {
  const { mode } = request.body as { mode: 'local' | 'remote' };

  if (mode !== 'local' && mode !== 'remote') {
    return reply.status(400).send({
      success: false,
      message: 'Invalid game mode. Must be "local" or "remote".'
    });
  }

  const gameId = gameManager.createGame(mode, null);
  return { gameId, success: true };
}

export async function getExistingGame(request: AuthenticatedRequest, reply: FastifyReply) {
  const userId = request.user.id; // This is the user's ID from the 'users' table
  console.log('Fetching existing game for user ID:', userId);
  const db = await getDb(); // Get database instance

  // Get the existing game session information from your in-memory gameManager
  const existingGameSession = gameManager.getPlayerSession(userId);

  if (!existingGameSession) {
    return reply.status(200).send({
      hasExistingGame: false,
      message: 'No existing game found.'
    });
  }

  const { gameId, gameMode, state, isCreator, isTourMatch } = existingGameSession;
  let participantId: number | undefined; // Initialize participantId

  // If it's a tournament match, we need to determine the specific tournament_participants.id
  if (isTourMatch) {
    try {
        // Fetch the tournament match details from the database using the gameId.
        // Tournament.findMatchByGameId should return player1_participant_id, player2_participant_id, and tournament_mode.
        const match = await Tournament.findMatchByGameId(db, gameId);

        if (match) {
            // Check if the current userId is directly associated with player1_participant_id
            let player1Participant = null;
            if (match.player1_participant_id) {
                player1Participant = await Tournament.getParticipantById(db, match.player1_participant_id);
                if (player1Participant && player1Participant.user_id === userId) {
                    participantId = match.player1_participant_id;
                }
            }

            // Check if the current userId is directly associated with player2_participant_id
            let player2Participant = null;
            if (!participantId && match.player2_participant_id) { // Only check if not already found
                player2Participant = await Tournament.getParticipantById(db, match.player2_participant_id);
                if (player2Participant && player2Participant.user_id === userId) {
                    participantId = match.player2_participant_id;
                }
            }

            // If still no direct participantId, and it's a local tournament, check for host-guest relationship
            if (!participantId && match.tournament_mode === 'local') {
                // Collect participants involved in this specific match that were fetched above
                const participantsInMatch = [];
                if (player1Participant) participantsInMatch.push(player1Participant);
                if (player2Participant) participantsInMatch.push(player2Participant);

                for (const participant of participantsInMatch) {
                    // If it's a guest and has a host, check if the current userId is that host's user_id
                    if (participant.is_guest && participant.host_id) {
                        const hostParticipant = await Tournament.getParticipantById(db, participant.host_id);
                        if (hostParticipant && hostParticipant.user_id === userId) {
                            participantId = participant.id; // Found the guest's participant ID controlled by this user
                            break;
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error determining participantId for existing tournament game session:", error);
        // It's crucial to log this error. Decide if you want to fail the request
        // or just omit participantId in the response. For now, it will be undefined.
    }
  }

  // Send the response, including the determined participantId (will be undefined for non-tour matches or if not found)
  return reply.status(200).send({
    hasExistingGame: true,
    gameId,
    gameMode,
    state,
    isCreator,
    isTourMatch,
    participantId // This will be undefined if it's not a tour match or if no participantId was resolved
  });
}

// export function getExistingGame(request: AuthenticatedRequest, reply: FastifyReply) {
//   const playerId = request.user.id;
//   const existingGame = gameManager.getPlayerSession(playerId);
//   if (!existingGame) {
//     return reply.status(200).send({
//       hasExistingGame: false,
//       message: 'No existing game found.'
//     });
//   }

//   const { gameId, gameMode, state, isCreator, isTourMatch } = existingGame;
//   return { hasExistingGame: true, gameId, gameMode, state, isCreator, isTourMatch };
// }

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
