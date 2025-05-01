// tournament.controller.ts
import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../@types/fastify';
import { getDb } from '../db';
import { gameManager } from '../game/GameManager';
import { Database } from 'sqlite';
import Tournament from '../models/tournament';
import { onlineUsers } from '../game/ws.types.js'; // Import to access online users websockets

/*-----------------------------NOTIFY RECIPIENT-----------------------------*/

// notify all online users (not only participants)
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

// Notification helper for tournament participants
async function notifyTournamentParticipants(
  db: Database,
  tournamentId: number,
  eventType: string,
  eventData: any,
  excludeUserId?: number
): Promise<void> {
  try {
    // Get all participants of the tournament
    const participants = await Tournament.getTournamentParticipants(db, tournamentId);
    
    // Send notifications to all online participants
    for (const participant of participants) {
      // Skip excluded user if provided
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
    // Get updated match data
    const match = await db.get(`
      SELECT 
        tm.*,
        tp1.alias as player1_alias,
        tp2.alias as player2_alias,
        u1.username as player1_username,
        u2.username as player2_username
      FROM tournament_matches tm
      LEFT JOIN tournament_participants tp1 ON tm.player1_id = tp1.user_id AND tp1.tournament_id = tm.tournament_id
      LEFT JOIN tournament_participants tp2 ON tm.player2_id = tp2.user_id AND tp2.tournament_id = tm.tournament_id
      LEFT JOIN users u1 ON tm.player1_id = u1.id
      LEFT JOIN users u2 ON tm.player2_id = u2.id
      WHERE tm.id = ? AND tm.tournament_id = ?`,
      [matchId, tournamentId]
    );

    if (!match) return;

    // Notify all participants about match update
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

// Controller for tournament operations
export async function getTournaments(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  const db = await getDb();
  try {
    const tournaments = await Tournament.findActiveTournaments(db);
    return reply.send({ success: true, tournaments });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch tournaments' });
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
    // Get tournament info
    const tournament = await Tournament.findById(db, tournamentId);
    
    if (!tournament) {
      return reply.status(404).send({ success: false, error: 'Tournament not found' });
    }
    
    // Get tournament matches
    const matches = await Tournament.getTournamentMatches(db, tournamentId);
    
    // Get participants
    const participants = await Tournament.getTournamentParticipants(db, tournamentId);
    
    return reply.send({ 
      success: true, 
      tournament,
      matches,
      participants
    });
  } catch (error) {
    console.error('Error fetching tournament details:', error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch tournament details' });
  }
}

export async function registerForTournament(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  if (!request.params.id) {
    return reply.status(400).send({
      success: false,
      error: 'Tournament ID is required'
    });
  }
  
  const tournamentId = parseInt(request.params.id);
  const userId = request.user.id;
  const { alias } = request.body as { alias: string };
  const db = await getDb();
  
  // Validate alias
  if (!alias || typeof alias !== 'string' || alias.trim() === '') {
    return reply.status(400).send({
      success: false,
      error: 'A valid alias is required to join a tournament'
    });
  }
  
  try {
    await db.run('BEGIN TRANSACTION');
    
    // Check if tournament exists and is in registration phase
    const tournament = await Tournament.isPendingTournament(db, tournamentId);
    
    if (!tournament) {
      await db.run('ROLLBACK');
      return reply.status(400).send({ 
        success: false, 
        error: 'Tournament not found or registration closed' 
      });
    }
    
    // Check if user is already registered
    const existingRegistration = await Tournament.isUserRegistered(db, tournamentId, userId);
    
    if (existingRegistration) {
      await db.run('ROLLBACK');
      return reply.status(400).send({ 
        success: false, 
        error: 'You are already registered for this tournament' 
      });
    }
    
    // Check if alias is already taken in this tournament
    const existingAlias = await Tournament.isAliasTaken(db, tournamentId, alias);
    
    if (existingAlias) {
      await db.run('ROLLBACK');
      return reply.status(400).send({ 
        success: false, 
        error: 'This alias is already taken in this tournament. Please choose another one.' 
      });
    }
    
    // Check if tournament is full (now always 4 players)
    const participantCount = await Tournament.getParticipantCount(db, tournamentId);
    
    if (participantCount >= 4) {
      await db.run('ROLLBACK');
      return reply.status(400).send({ 
        success: false, 
        error: 'Tournament is full' 
      });
    }
    
    // Register user with alias
    const newParticipantCount = await Tournament.addParticipant(db, tournamentId, userId, alias);
    
    // Get user info for notification
    const userData = await db.get(
      `SELECT u.id, u.username, p.display_name
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = ?`,
      userId
    );
    
    // Create participant object for notifications
    const newParticipant = {
      id: userId,
      username: userData.username,
      alias: alias,
      elo: 1000, // Default ELO
      status: 'active'
    };
    
    // Notify all current participants that someone joined
    await notifyTournamentParticipants(
      db,
      tournamentId,
      'participant-joined',
      {
        tournamentId,
        participant: newParticipant,
        message: `${alias} has joined the tournament!`
      },
      userId // Exclude the joining user from notifications
    );
    
    // If we have exactly 4 participants, start the tournament automatically
    let tournamentStarted = false;
    if (newParticipantCount === 4) {
      // Update available tournaments tab
      // Start tournament logic
      await startTournamentInternal(db, tournamentId);
      tournamentStarted = true;
    }
    
    await db.run('COMMIT');

    // Update tournament page
    notifyOnlineUsers('tournament-update', {
      allTournaments: await Tournament.findActiveTournaments(db),
      userTournaments: await Tournament.findTournamentsByUserId(db, userId),
      message: `A new participant joined tournament ${tournamentId}!`
    });
    
    return reply.send({ 
      success: true, 
      message: 'Successfully registered for tournament',
      tournament_started: tournamentStarted
    });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error registering for tournament:', error);
    return reply.status(500).send({ 
      success: false, 
      error: 'Failed to register for tournament' 
    });
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
    return reply.status(500).send({ 
      success: false, 
      error: 'Failed to fetch your tournaments' 
    });
  }
}

export async function joinTournamentMatch(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  if (!request.params.id) {
    return reply.status(400).send({
      success: false,
      error: 'Match ID is required'
    });
  }
  
  const matchId = parseInt(request.params.id);
  const userId = request.user.id;
  const db = await getDb();
  
  try {
    // Get match details
    const match = await Tournament.getMatchForPlayer(db, matchId, userId);
    
    if (!match) {
      return reply.status(404).send({ 
        success: false, 
        error: 'Match not found or you are not a participant' 
      });
    }
    
    let gameId = match.game_id;
    
    // If match doesn't have a game yet, create one
    if (!gameId) {
      gameId = gameManager.createGame('remote', true);
      console.log('Created new game:', gameId);
      // Update match with game ID and status
      await Tournament.setMatchGameId(db, matchId, gameId);
      
      // Notify match status update
      await notifyMatchUpdate(db, match.tournament_id, matchId);
    }
    
    return reply.send({ success: true, gameId });
  } catch (error) {
    console.error('Error joining tournament match:', error);
    return reply.status(500).send({ 
      success: false, 
      error: 'Failed to join match' 
    });
  }
}

// Admin function to create a tournament
export async function createTournament(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  const { name, description } = request.body as any;
  const db = await getDb();
  
  try {
    const result = await Tournament.create(db, { name, description });
    if (result) {
      notifyOnlineUsers('tournament-update', {
        allTournaments: await Tournament.findActiveTournaments(db),
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
    return reply.status(500).send({ 
      success: false, 
      error: 'Failed to create tournament' 
    });
  }
}

// Internal function to start a tournament
async function startTournamentInternal(db: Database, tournamentId: number): Promise<void> {
  try {
    // Update tournament status
    await Tournament.updateStatus(db, tournamentId, 'active');
    
    // Mark all participants as active
    await db.run(`
      UPDATE tournament_participants
      SET status = 'active'
      WHERE tournament_id = ?
    `, [tournamentId]);
    
    // Get participants with their ELO ratings
    const participants = await Tournament.getParticipantsForSeeding(db, tournamentId);
    
    // Since there are always 4 participants, we'll organize 2 semifinal matches
    
    // Semifinal 1: 1st seed vs 4th seed
    await Tournament.createMatch(db, tournamentId, 1, 1, participants[0].user_id, participants[3].user_id);
    
    // Semifinal 2: 2nd seed vs 3rd seed
    await Tournament.createMatch(db, tournamentId, 1, 2, participants[1].user_id, participants[2].user_id);
    
    // Create empty final match (round 2)
    await Tournament.createMatch(db, tournamentId, 2, 1);

    // Get the updated tournament data
    const tournament = await Tournament.findById(db, tournamentId);
    
    // Get the newly created matches
    const matches = await Tournament.getTournamentMatches(db, tournamentId);
    
    // Notify all participants that the tournament has started
    await notifyTournamentParticipants(
      db,
      tournamentId,
      'tournament-started',
      {
        tournamentId,
        tournament,
        matches,
        message: 'The tournament has started! The bracket is now available.'
      }
    );
  } catch (error) {
    console.error('Error in startTournamentInternal:', error);
    throw error;
  }
}

// Admin function to manually start a tournament - now only used as a backup
export async function startTournament(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  if (!request.params.id) {
    return reply.status(400).send({
      success: false,
      error: 'Tournament ID is required'
    });
  }

  const tournamentId = parseInt(request.params.id);
  const db = await getDb();
  
  try {
    await db.run('BEGIN TRANSACTION');
    
    // Check if we have exactly 4 participants
    const participantCount = await Tournament.getParticipantCount(db, tournamentId);
    
    if (participantCount !== 4) {
      await db.run('ROLLBACK');
      return reply.status(400).send({
        success: false,
        error: 'Tournament must have exactly 4 participants to start'
      });
    }
    
    await startTournamentInternal(db, tournamentId);
    
    await db.run('COMMIT');
    
    return reply.send({ 
      success: true, 
      message: 'Tournament started successfully' 
    });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error starting tournament:', error);
    return reply.status(500).send({ 
      success: false, 
      error: 'Failed to start tournament' 
    });
  }
}

// Update match result from a game
export async function updateTournamentMatchResult(gameId: string, winnerId: number): Promise<void> {
  const db = await getDb();
  
  try {
    // Find the match with this game ID
    const match = await Tournament.findMatchByGameId(db, gameId);
    
    if (!match) return;
    
    await db.run('BEGIN TRANSACTION');
    
    // Update match result
    await Tournament.setMatchWinner(db, match.id, winnerId);
    
    // Update participant status for the loser
    const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
    await Tournament.setParticipantStatus(db, match.tournament_id, loserId, 'eliminated');
    
    // Notify match update
    await notifyMatchUpdate(db, match.tournament_id, match.id);
    
    // If this is the final match (round 2), update tournament and winner
    if (match.round === 2) {
      await Tournament.updateStatus(db, match.tournament_id, 'completed');
      await Tournament.setParticipantStatus(db, match.tournament_id, winnerId, 'winner');
      
      // Get final tournament data for notification
      const tournament = await Tournament.findById(db, match.tournament_id);
      const matches = await Tournament.getTournamentMatches(db, match.tournament_id);
      const participants = await Tournament.getTournamentParticipants(db, match.tournament_id);
      const winner = participants.find((p: any) => p.id === winnerId);
      
      // Notify tournament completed
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
      // Otherwise, advance winner to the final
      await advanceToNextRound(db, match, winnerId);
    }
    
    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error updating tournament match result:', error);
  }
}

// Helper to advance winner to next round
async function advanceToNextRound(
  db: Database, 
  match: { 
    tournament_id: number; 
    round: number; 
    match_number: number;
    id?: number;
  }, 
  winnerId: number
): Promise<void> {
  // For a 4-player tournament, there's only one path:
  // Round 1, Match 1 winner goes to Round 2, Match 1 as player1
  // Round 1, Match 2 winner goes to Round 2, Match 1 as player2
  
  if (match.round === 1) {
    const isPlayer1 = match.match_number === 1;
    
    await Tournament.updateMatchPlayer(db, match.tournament_id, 2, 1, isPlayer1, winnerId);
    
    // Check if both players are set for the final match
    const finalMatch = await Tournament.getFinalMatch(db, match.tournament_id);
    
    // If both players are set, update status to ready
    if (finalMatch.player1_id && finalMatch.player2_id) {
      await db.run(`
        UPDATE tournament_matches
        SET status = 'scheduled'
        WHERE id = ?
      `, [finalMatch.id]);
      
      // Notify about final match update
      await notifyMatchUpdate(db, match.tournament_id, finalMatch.id);
    }
  }
}