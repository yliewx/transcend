import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../@types/fastify';
import { getDb } from '../db';
import { gameManager } from '../game/GameManager';
import { Database } from 'sqlite';
import Tournament from '../models/tournament';
import { onlineUsers } from '../game/ws.types.js';
import { GameState } from "../game/PongGame";
import  GameStats from '../models/game.stats';
/*-----------------------------NOTIFY RECIPIENT-----------------------------*/

async function notifyOnlineUsers(eventType: string, eventData: {
  tournamentId?: number,
  tournament?: any,
  allTournaments: any,
  userTournaments?: any,
  message: string
}) {
  for (const [id, socket] of onlineUsers.entries()) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: eventType,
        data: eventData
      }));
    }
  }
}

async function notifyTournamentParticipants(
  db: Database,
  tournamentId: number,
  eventType: string,
  eventData: any,
  excludeUserId?: number
): Promise<void> {
  try {
    const participants = await Tournament.getTournamentParticipants(db, tournamentId);
    
    for (const participant of participants) {
      if (excludeUserId && participant.id === excludeUserId) {
        continue;
      }
      
      const participantSocket = onlineUsers.get(participant.id);
      const userTournaments = await Tournament.findTournamentsByUserId(db, participant.id);
      if (participantSocket && participantSocket.readyState === WebSocket.OPEN) {
        participantSocket.send(JSON.stringify({
          type: eventType,
          data: { ...eventData, userTournaments }
        }));
      }
    }
  } catch (error) {
    console.error('Error notifying tournament participants:', error);
  }
}

async function notifyMatchUpdate(db: Database, tournamentId: number, matchId: number): Promise<void> {
  try {
    console.log('Notifying match update:', tournamentId, matchId);
    const match = await db.get(`
      SELECT
        tm.*,
        tp1.alias as player1_alias,
        tp2.alias as player2_alias,
        u1.username as player1_username,
        u2.username as player2_username
      FROM tournament_matches tm
      LEFT JOIN tournament_participants tp1 ON tm.player1_participant_id = tp1.id -- Correct: Join on participant ID
      LEFT JOIN tournament_participants tp2 ON tm.player2_participant_id = tp2.id -- Correct: Join on participant ID
      LEFT JOIN users u1 ON tp1.user_id = u1.id -- Correct: Join users via participant's user_id
      LEFT JOIN users u2 ON tp2.user_id = u2.id -- Correct: Join users via participant's user_id
      WHERE tm.id = ? AND tm.tournament_id = ?`,
      [matchId, tournamentId]
    );

    if (!match) return;

    await notifyTournamentParticipants(
      db,
      tournamentId,
      'match-updated',
      {
        tournamentId,
        match,
        message: `Match #${match.match_number} has been updated`
      }
    );
  } catch (error) {
    console.error('Error notifying match update:', error);
  }
}

/*----------------------------TOURNAMENT ROUTES-----------------------------*/

export async function getTournaments(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  const db = await getDb();
  try {
    const tournaments = await Tournament.findPendingTournaments(db);
    return reply.send({ success: true, tournaments });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return reply.status(400).send({ success: false, error: 'Failed to fetch tournaments' });
  }
}

export async function getUserTournaments(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  const userId = request.user.id;
  const db = await getDb();
  try {
    const tournaments = await Tournament.findTournamentsByUserId(db, userId);
    return reply.send({ success: true, tournaments });
  } catch (error) {
    console.error('Error fetching user tournaments:', error);
    return reply.status(400).send({ 
      success: false, 
      error: 'Failed to fetch your tournaments' 
    });
  }
}

export async function getTournamentDetails(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  if (!request.params.id) {
    return reply.status(400).send({
      success: false,
      error: 'Tournament ID is required'
    });
  }
  const tournamentId = parseInt(request.params.id);
  const db = await getDb();
  
  try {
    const tournament = await Tournament.findById(db, tournamentId);
    
    if (!tournament) {
      return reply.status(404).send({ success: false, error: 'Tournament not found' });
    }
    
    const matches = await Tournament.getTournamentMatches(db, tournamentId);
    
    const participants = await Tournament.getTournamentParticipants(db, tournamentId);
    
    return reply.send({ 
      success: true, 
      tournament,
      matches,
      participants
    });
  } catch (error) {
    console.error('Error fetching tournament details:', error);
    return reply.status(400).send({ success: false, error: 'Failed to fetch tournament details' });
  }
}


export async function createTournament(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  const { name, description, mode } = request.body as any;
  const db = await getDb();
  
  try {
    const result = await Tournament.create(db, { name, description, mode });
    if (result) {
      notifyOnlineUsers('tournament-update', {
        allTournaments: await Tournament.findPendingTournaments(db),
        message: 'A new tournament was created'
      });
    }
    
    return reply.send({ 
      success: true, 
      tournamentId: result.lastID,
      message: 'Tournament created successfully' 
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return reply.status(400).send({ 
      success: false, 
      error: 'Failed to create tournament' 
    });
  }
}


export async function registerForTournament(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {  
  const db = await getDb();
  
  try {
    await db.run('BEGIN TRANSACTION');

    if (!request.params.id) throw new Error('Tournament ID is required');
    const tournamentId = parseInt(request.params.id);
    const userId = request.user.id;
    let { ua, oa } = request.body as { ua: string, oa: string | null };
    
    const tournament = await Tournament.isPendingTournament(db, tournamentId);
    if (!tournament) throw new Error('Tournament not found or already started');
    
    const existingRegistration = await Tournament.isUserRegistered(db, tournamentId, userId);
    if (existingRegistration) throw new Error('User already registered for this tournament');

    ua = ua.trim();
    oa = oa ? oa.trim() : null;
    if (!ua || typeof ua != 'string' || ua.length < 3 || ua.length > 20) 
      throw new Error('A valid user alias between 3 to 20 characters is required to join a tournament');
    if (tournament.mode == 'local' && (!oa || typeof oa != 'string' || oa.length < 3 || oa.length > 20))
      throw new Error('A valid opponent alias between 3 to 20 characters is required to join a local tournament');

    if (await Tournament.isAliasTaken(db, tournamentId, ua)) throw new Error('User alias already taken');
    if (tournament.mode == 'local' && oa && await Tournament.isAliasTaken(db, tournamentId, oa)) 
      throw new Error('Opponent alias already taken');

    const participantCount = await Tournament.getParticipantCount(db, tournamentId);
    if (participantCount == 4) 
      throw new Error('Tournament is full');
    // if (tournament.mode == 'local' && participantCount == 2) 
    //   throw new Error('Tournament is full');
    
    await Tournament.addParticipant(db, tournamentId, userId, ua, oa);
    const newParticipantCount = await Tournament.getParticipantCount(db, tournamentId);

    let tournamentStarted = false;
    if (newParticipantCount === 4) {
      await startTournamentInternal(db, tournamentId, tournament.mode);
      tournamentStarted = true;
    }
  //   const userData = await db.get(
  //     `SELECT u.id, u.username, p.display_name
  //      FROM users u
  //      LEFT JOIN profiles p ON u.id = p.user_id
  //      WHERE u.id = ?`,
  //     userId
  //   );
    
  //   const newParticipant = {
  //     id: userId,
  //     username: userData.username,
  //     alias: alias,
  //     elo: 1000,
  //     status: 'active'
  //   };
    
  //   await notifyTournamentParticipants(
  //     db,
  //     tournamentId,
  //     'participant-joined',
  //     {
  //       tournamentId,
  //       participant: newParticipant,
  //       message: `${alias} has joined the tournament!`
  //     },
  //     userId 
  //   );
    
    
    
    await db.run('COMMIT');
      
    return reply.send({ 
      success: true, 
      message: 'Successfully registered for tournament',
      tournament_started: tournamentStarted
    });
  } catch (error: unknown) {
    console.error('Error registering for tournament:', error);
    await db.run('ROLLBACK');
    return reply.status(400).send({ 
      success: false, 
      error: error instanceof Error ? error.message : 'An error occurred while registering for the tournament' 
    });
  }
}

// async function startTournamentInternal(db: Database, tournamentId: number, mode: 'local' | 'remote'): Promise<void> {
//   try {
//     await Tournament.updateTournamentStatus(db, tournamentId, 'active');
//     await Tournament.updateAllParticipantStatus(db, tournamentId, 'active');

//     const participants = await Tournament.getParticipantsForSeeding(db, tournamentId);
//     if (mode == 'local') {
//       let matchNumber = 1;
//       for (let i = 0; i < 4; i ++) {
//         if (participants[i].is_guest) {
//           await Tournament.createMatch(db, tournamentId, mode, 1, matchNumber, participants[i].id, participants[i].host_id);
//           matchNumber++;
//         }
//       }
//     }
//     else {
//       await Tournament.createMatch(db, tournamentId, mode, 1, 1, participants[0].id, participants[3].id);    
//       await Tournament.createMatch(db, tournamentId, mode, 1, 2, participants[1].id, participants[2].id);    
//     }
//     await Tournament.createMatch(db, tournamentId, mode, 2, 1, null, null);

//     const tournament = await Tournament.findById(db, tournamentId);    
//     const matches = await Tournament.getTournamentMatches(db, tournamentId);
    
//     await notifyTournamentParticipants(
//       db,
//       tournamentId,
//       'tournament-started',
//       {
//         tournamentId,
//         tournament,
//         matches,
//         message: 'The tournament has started! The bracket is now available.'
//       }
//     );
//   } catch (error) {
//     console.error('Error in startTournamentInternal:', error);
//     throw error;
//   }
// }

async function startTournamentInternal(db: Database, tournamentId: number, mode: 'local' | 'remote'): Promise<void> {
  try {
    // 1. Update tournament and participant statuses
    await Tournament.updateTournamentStatus(db, tournamentId, 'active'); // Renamed from updateStatus
    await Tournament.updateAllParticipantStatus(db, tournamentId, 'active'); // Assuming this is a new method you've added

    // 2. Get participants, now making sure the `is_guest` and `host_id` are available for local mode logic
    const participants = await Tournament.getParticipantsForSeeding(db, tournamentId);
    // Ensure getParticipantsForSeeding returns tp.id, tp.user_id, tp.alias, tp.is_guest, tp.host_id, ps.elo_rating

    if (mode === 'local') {
      // In local mode, we assume matches are between a guest and their host
      // This implies 2 matches total for a 4-participant local tournament
      // Match 1: Guest 1 vs Host 1
      // Match 2: Guest 2 vs Host 2

      // First, filter out the hosts and guests, assuming 2 hosts and 2 guests for a 4-player local game
      const hosts = participants.filter(p => !p.is_guest);
      const guests = participants.filter(p => p.is_guest);

      // Verify assumptions: Should have 2 hosts and 2 guests for a 4-player local tournament
      if (hosts.length !== 2 || guests.length !== 2) {
        console.warn(`Local tournament ${tournamentId} has unexpected participant count/distribution. Hosts: ${hosts.length}, Guests: ${guests.length}`);
        // You might want to throw an error here or handle it more robustly
      }

      // Match 1: First host vs their guest
      const host1 = hosts[0];
      const guest1 = guests.find(g => g.host_id === host1.id); // Find guest whose host is host1
      if (!host1 || !guest1) {
          throw new Error('Could not find sufficient host/guest pairs for local tournament seeding (Match 1).');
      }
      await Tournament.createMatch(db, tournamentId, mode, 1, 1, host1.id, guest1.id);

      // Match 2: Second host vs their guest
      const host2 = hosts[1];
      const guest2 = guests.find(g => g.host_id === host2.id); // Find guest whose host is host2
      if (!host2 || !guest2) {
          throw new Error('Could not find sufficient host/guest pairs for local tournament seeding (Match 2).');
      }
      await Tournament.createMatch(db, tournamentId, mode, 1, 2, host2.id, guest2.id);

    } else { // mode === 'remote'
      // Standard remote tournament seeding (Elo-based)
      await Tournament.createMatch(db, tournamentId, mode, 1, 1, participants[0].id, participants[3].id);
      await Tournament.createMatch(db, tournamentId, mode, 1, 2, participants[1].id, participants[2].id);
    }

    // Always create the final match (Round 2, Match 1) as null for both modes
    await Tournament.createMatch(db, tournamentId, mode, 2, 1, null, null);

    // 3. Fetch updated tournament details and matches for notification
    const updatedTournament = await Tournament.findById(db, tournamentId);
    const matches = await Tournament.getTournamentMatches(db, tournamentId); // Ensure this fetches all matches, including newly created ones

    // 4. Notify participants
    await notifyTournamentParticipants(
      db,
      tournamentId,
      'tournament-started',
      {
        tournamentId,
        tournament: updatedTournament, // Use the updated tournament object
        matches,
        message: 'The tournament has started! The bracket is now available.'
      }
    );
  } catch (error) {
    console.error('Error in startTournamentInternal:', error);
    throw error; // Re-throw to allow caller to handle (e.g., rollback transaction)
  }
}

// export async function joinTournamentMatch(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
//   if (!request.params.id) {
//     return reply.status(400).send({
//       success: false,
//       error: 'Match ID is required'
//     });
//   }
  
//   const matchId = parseInt(request.params.id);
//   const userId = request.user.id;
//   const db = await getDb();
  
//   try {
//     const match = await Tournament.getMatchForPlayer(db, matchId, userId);
    
//     if (!match) {
//       return reply.status(404).send({ 
//         success: false, 
//         error: 'Match not found or you are not a participant' 
//       });
//     }
    
//     let gameId = match.game_id;
    
//     if (!gameId) {
//       gameId = gameManager.createGame(match.mode, true);
//       console.log(`Created new ${match.mode} game:`, gameId);
//       await Tournament.setMatchGameId(db, matchId, gameId);      
//       await notifyMatchUpdate(db, match.tournament_id, matchId);
//     }
    
//     return reply.send({ success: true, gameId });
//   } catch (error) {
//     console.error('Error joining tournament match:', error);
//     return reply.status(400).send({ 
//       success: false, 
//       error: 'Failed to join match' 
//     });
//   }
// }

export async function joinTournamentMatch(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  if (!request.params.id) {
    return reply.status(400).send({
      success: false,
      error: 'Match ID is required'
    });
  }

  const matchId = parseInt(request.params.id);
  const userId = request.user.id; // This is the user's ID from the 'users' table
  const db = await getDb();

  try {
    // Get match details and verify user participation.
    // getMatchForPlayer should also return player1_participant_id and player2_participant_id
    const match = await Tournament.getMatchForPlayer(db, matchId, userId);

    if (!match) {
      return reply.status(404).send({
        success: false,
        error: 'Match not found or you are not a participant'
      });
    }

    // Determine the specific tournament_participants.id for this userId in this match
    let currentParticipantId: number | null = null;

    // Check if the user's ID directly matches a user_id in the participant records for player1 or player2
    if (match.player1_participant_id) {
        const participant1 = await Tournament.getParticipantById(db, match.player1_participant_id);
        if (participant1 && participant1.user_id === userId) {
            currentParticipantId = match.player1_participant_id;
        }
    }
    if (!currentParticipantId && match.player2_participant_id) {
        const participant2 = await Tournament.getParticipantById(db, match.player2_participant_id);
        if (participant2 && participant2.user_id === userId) {
            currentParticipantId = match.player2_participant_id;
        }
    }

    // If still not found, and it's a local tournament, check if the userId is a host for one of the guest participants
    // This logic relies on Tournament.getParticipantById also returning is_guest and host_id
    if (!currentParticipantId && match.tournament_mode === 'local') {
        // Fetch participants involved in this match to find the one associated with this userId (as host)
        const participantsInMatch = await db.all(`
            SELECT tp.id, tp.user_id, tp.is_guest, tp.host_id
            FROM tournament_participants tp
            WHERE tp.id IN (?, ?) AND tp.tournament_id = ?
        `, [match.player1_participant_id, match.player2_participant_id, match.tournament_id]);

        for (const participant of participantsInMatch) {
            if (participant.is_guest && participant.host_id) {
                const hostParticipant = await Tournament.getParticipantById(db, participant.host_id);
                if (hostParticipant && hostParticipant.user_id === userId) {
                    currentParticipantId = participant.id; // This guest's participant ID is what the host will 'control'
                    break;
                }
            }
        }
    }

    if (currentParticipantId === null) {
        return reply.status(400).send({ success: false, error: 'Could not determine your participant ID for this match context.' });
    }

    let gameId = match.game_id;

    if (!gameId) {
      gameId = gameManager.createGame(match.tournament_mode, match.tournament_id); // Use match.tournament_mode
      console.log(`Created new ${match.tournament_mode} game:`, gameId);
      await Tournament.setMatchGameId(db, matchId, gameId);
      await notifyMatchUpdate(db, match.tournament_id, matchId);
    }

    return reply.send({ success: true, gameId, participantId: currentParticipantId });

  } catch (error) {
    console.error('Error joining tournament match:', error);
    return reply.status(400).send({
      success: false,
      error: 'Failed to join match'
    });
  }
}


async function processUserGameResults(
    db: Database,
    userId: number,
    opponentUserId: number,
    winnerUserId: number,
    gameId: string, // Unique game identifier for match history (this is the gameRoom.id)
) {
    let transactionStarted = true;
    try {
        await db.run('BEGIN TRANSACTION');

        const result: 'win' | 'loss' = winnerUserId === userId ? 'win' : 'loss';
        await GameStats.updateMatches(db, userId, result);
        await GameStats.updatePlayerElo(db, userId, opponentUserId, winnerUserId === userId ? 1 : 0);
        await GameStats.updateWinStreak(db, userId, winnerUserId === userId);

        await db.run('COMMIT');
    } catch (error) {
        if (transactionStarted) {
            await db.run('ROLLBACK');
        }
        console.error(`Error processing user game results for user ${userId} in game ${gameId}:`, error);
        throw error;
    }
}

// export async function updateTournamentMatchResult(gameId: string, winnerId: number): Promise<void> {
//   const db = await getDb();
  
//   try {
//     const match = await Tournament.findMatchByGameId(db, gameId);
//     if (!match) return;
    
//     await db.run('BEGIN TRANSACTION');
    
//     await Tournament.setMatchWinner(db, match.id, winnerId);
    
//     const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
//     await Tournament.setParticipantStatus(db, match.tournament_id, loserId, 'eliminated');
    
//     await notifyMatchUpdate(db, match.tournament_id, match.id);
    
//     if (match.round === 2) {
//       await Tournament.updateTournamentStatus(db, match.tournament_id, 'completed');
//       await Tournament.setParticipantStatus(db, match.tournament_id, winnerId, 'winner');
      
//       const tournament = await Tournament.findById(db, match.tournament_id);
//       const matches = await Tournament.getTournamentMatches(db, match.tournament_id);
//       const participants = await Tournament.getTournamentParticipants(db, match.tournament_id);
//       const winner = participants.find((p: any) => p.id === winnerId);
      
//       await notifyTournamentParticipants(
//         db,
//         match.tournament_id,
//         'tournament-completed',
//         {
//           tournamentId: match.tournament_id,
//           tournament,
//           matches,
//           participants,
//           winner,
//           message: `The tournament has been completed! ${winner?.alias || 'Someone'} is the champion!`
//         }
//       );
//       await notifyTournamentParticipants(
//         db,
//         match.tournament_id,
//         'tournament-update',
//         {
//           tournamentId: match.tournament_id,
//           tournament,
//           matches,
//           participants,
//           winner,
//           message: `The tournament has been completed! ${winner?.alias || 'Someone'} is the champion!`
//         }
//       );
//     } else {
//       await advanceToNextRound(db, match, winnerId);
//     }
    
//     await db.run('COMMIT');
//   } catch (error) {
//     await db.run('ROLLBACK');
//     console.error('Error updating tournament match result:', error);
//   }
// }


export async function updateTournamentMatchResult(
    gameId: string,
    winnerParticipantId: number,
    finalState: GameState,
    gameLeftParticipantId: number,  // NEW: Actual participantId of the player on the left in the game
    gameRightParticipantId: number  // NEW: Actual participantId of the player on the right in the game
): Promise<void> {
  const db = await getDb();

  try {
    const match = await Tournament.findMatchByGameId(db, gameId);
    if (!match) {
        console.warn(`Tournament match with game ID ${gameId} not found for result update.`);
        return;
    }

    await db.run('BEGIN TRANSACTION'); // Transaction for tournament match updates

    await Tournament.setMatchWinner(db, match.id, winnerParticipantId);

    // Identify the loser participant ID based on who wasn't the winner
    const loserParticipantId = winnerParticipantId === gameLeftParticipantId ? gameRightParticipantId : gameLeftParticipantId;

    await Tournament.setParticipantStatus(db, match.tournament_id, loserParticipantId, 'eliminated');

    await notifyMatchUpdate(db, match.tournament_id, match.id);

    console.log('[updateTournamentMatchResult] gameId:', gameId);
    console.log('matchId:', match.id);
    console.log(`winner: ${winnerParticipantId} | loser: ${loserParticipantId}`);

    // Conditional logic for Elo/Stats/Match History updates for remote (ranked) tournament games
    if (match.mode === 'remote') {
        const winnerUserId = await Tournament.getUserIdByParticipantId(db, winnerParticipantId);
        const loserUserId = await Tournament.getUserIdByParticipantId(db, loserParticipantId);

        if (winnerUserId === null || loserUserId === null) {
            console.error(`Could not retrieve user IDs for participants ${winnerParticipantId} and ${loserParticipantId}. Elo/Match History not updated.`);
            await db.run('ROLLBACK'); // Rollback the ongoing tournament transaction if we can't record stats
            return;
        }

        console.log(`Updating Elo and Match History for remote tournament game between user ${winnerUserId} and ${loserUserId}`);
        
        // --- Determine actual left/right user IDs for GameStats.recordGameResult ---
        // Use the explicitly passed gameLeftParticipantId and gameRightParticipantId
        const leftSideUserId = await Tournament.getUserIdByParticipantId(db, gameLeftParticipantId);
        const rightSideUserId = await Tournament.getUserIdByParticipantId(db, gameRightParticipantId);

        if (leftSideUserId === null || rightSideUserId === null) {
             console.error(`Could not retrieve user IDs for left/right side participants (${gameLeftParticipantId}, ${gameRightParticipantId}). Cannot record detailed game result.`);
             // Decide how to handle: you might still proceed with Elo updates if possible,
             // but definitely skip GameStats.recordGameResult which relies on these.
        } else {
            // Record the full game result using the correct left/right user IDs and scores
            // This ensures player1_id gets left_score, player2_id gets right_score in match_history
            await GameStats.recordGameResult(
                db,
                leftSideUserId,  // player1_id (corresponds to actual left player in game)
                rightSideUserId, // player2_id (corresponds to actual right player in game)
                winnerUserId,    // winner_id (user_id)
                finalState.scoreLeft,
                finalState.scoreRight,
                match.tournament_id // Pass tournamentId
            );
        }

        // --- Update individual player stats (Elo, win streak etc.) ---
        // These now get accurate scores based on who was who in the game.


        // Process winner's stats
        await processUserGameResults(
            db,
            winnerUserId,
            loserUserId,
            winnerUserId,
            gameId, // Pass gameId to helper
        );

        // Process loser's stats
        await processUserGameResults(
            db,
            loserUserId,
            winnerUserId,
            winnerUserId, // winner_id for this context is still the overall winner's user ID
            gameId, // Pass gameId to helper
        );

    } else { // match.mode === 'local'
        console.log(`Local tournament match completed. Elo/Match History not updated for local mode.`);
    }

    // Tournament progression logic remains the same
    if (match.round === 2) { // Assuming 2 is the final round
      await Tournament.updateTournamentStatus(db, match.tournament_id, 'completed');
      await Tournament.setParticipantStatus(db, match.tournament_id, winnerParticipantId, 'winner');

      const tournament = await Tournament.findById(db, match.tournament_id);
      const matches = await Tournament.getTournamentMatches(db, match.tournament_id);
      const participants = await Tournament.getTournamentParticipants(db, match.tournament_id);
      const winner = participants.find((p: any) => p.participant_id === winnerParticipantId);

      await notifyTournamentParticipants(
        db,
        match.tournament_id,
        'tournament-completed',
        {
          tournamentId: match.tournament_id,
          tournament,
          matches,
          participants,
          winner,
          message: `The tournament has been completed! ${winner?.alias || 'Someone'} is the champion!`
        }
      );
      await notifyTournamentParticipants(
        db,
        match.tournament_id,
        'tournament-update',
        {
          tournamentId: match.tournament_id,
          tournament,
          matches,
          participants,
          winner,
          message: `The tournament has been completed! ${winner?.alias || 'Someone'} is the champion!`
        }
      );
    } else {
      await advanceToNextRound(db, match, winnerParticipantId);
    }

    await db.run('COMMIT'); // Commit transaction for tournament match updates
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error updating tournament match result:', error);
  }
}

// async function advanceToNextRound(
//   db: Database, 
//   match: { 
//     tournament_id: number; 
//     round: number; 
//     match_number: number;
//     id?: number;
//   }, 
//   winnerId: number
// ): Promise<void> {
//   if (match.round === 1) {
//     const isPlayer1 = match.match_number === 1;
    
//     await Tournament.updateMatchPlayer(db, match.tournament_id, 2, 1, isPlayer1, winnerId);
    
//     const finalMatch = await Tournament.getFinalMatch(db, match.tournament_id);
    
//     if (finalMatch.player1_id && finalMatch.player2_id) {
//       await db.run(`
//         UPDATE tournament_matches
//         SET status = 'scheduled'
//         WHERE id = ?
//       `, [finalMatch.id]);
      
//       await notifyMatchUpdate(db, match.tournament_id, finalMatch.id);
//     }
//   }
// }

async function advanceToNextRound(
  db: Database,
  match: {
    tournament_id: number;
    round: number;
    match_number: number;
    id?: number; // match.id is optional, but needed for finalMatch.id
  },
  winnerParticipantId: number // Renamed to clarify it's a participant ID
): Promise<void> {
  if (match.round === 1) {
    // Determine if the winner is player1 or player2 for the next round's match
    // In a single-elimination bracket, winner of match 1 (round 1) goes to player1_participant_id of final match
    // Winner of match 2 (round 1) goes to player2_participant_id of final match
    const isPlayer1InFinalMatch = match.match_number === 1; // Assuming match_number 1 advances to player1 slot in round 2, match 1

    // Update the player in the next round's match (Round 2, Match 1)
    await Tournament.updateMatchPlayer(
        db,
        match.tournament_id,
        2, // Next round
        1, // Next match number (assuming single final match)
        isPlayer1InFinalMatch,
        winnerParticipantId // This is the participant ID
    );

    // Fetch the updated final match details
    const finalMatch = await Tournament.getFinalMatch(db, match.tournament_id);
    console.error('Final match details:', finalMatch);
    // Check if both participant slots in the final match are now filled
    if (finalMatch && finalMatch.player1_participant_id && finalMatch.player2_participant_id) {
      console.log(`Final match ${finalMatch.id} is ready with participants:`, finalMatch.player1_participant_id, finalMatch.player2_participant_id);  
      await db.run(`
        UPDATE tournament_matches
        SET status = 'scheduled'
        WHERE id = ?
      `, [finalMatch.id]);

      // Notify about the final match being scheduled
      await notifyMatchUpdate(db, match.tournament_id, finalMatch.id);
    }
  }
}
