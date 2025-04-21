// tournament.controller.ts
import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../@types/fastify';
import { getDb } from '../db';
import { gameManager } from '../game/GameManager';
import { Database } from 'sqlite';

// Controller for tournament operations
export async function getTournaments(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  const db = await getDb();
  try {
    const tournaments = await db.all(`
      SELECT t.*, COUNT(tp.id) as current_participants 
      FROM tournaments t
      LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
      WHERE t.status != 'cancelled'
      GROUP BY t.id
      ORDER BY t.start_date DESC
    `);
    
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
      error: 'Match ID is required'
    });
  }
  const tournamentId = parseInt(request.params.id);
  const db = await getDb();
  
  try {
    // Get tournament info
    const tournament = await db.get(`
      SELECT t.*, COUNT(tp.id) as current_participants 
      FROM tournaments t
      LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
      WHERE t.id = ?
      GROUP BY t.id
    `, [tournamentId]);
    
    if (!tournament) {
      return reply.status(404).send({ success: false, error: 'Tournament not found' });
    }
    
    // Get tournament matches
    const matches = await db.all(`
      SELECT tm.*, 
        u1.username as player1_username, 
        u2.username as player2_username
      FROM tournament_matches tm
      LEFT JOIN users u1 ON tm.player1_id = u1.id
      LEFT JOIN users u2 ON tm.player2_id = u2.id
      WHERE tm.tournament_id = ?
      ORDER BY tm.round, tm.match_number
    `, [tournamentId]);
    
    // Get participants
    const participants = await db.all(`
      SELECT u.id, u.username, ps.elo_rating as elo
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      LEFT JOIN player_stats ps ON u.id = ps.user_id
      WHERE tp.tournament_id = ?
      ORDER BY ps.elo_rating DESC
    `, [tournamentId]);
    
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
      error: 'Match ID is required'
    });
  }
  const tournamentId = parseInt(request.params.id);
  const userId = request.user.id;
  const db = await getDb();
  
  try {
    // Check if tournament exists and is in registration phase
    const tournament = await db.get(`
      SELECT * FROM tournaments 
      WHERE id = ? AND status = 'pending'
    `, [tournamentId]);
    
    if (!tournament) {
      return reply.status(400).send({ 
        success: false, 
        error: 'Tournament not found or registration closed' 
      });
    }
    
    // Check if tournament is full
    const participantCount = await db.get(`
      SELECT COUNT(*) as count FROM tournament_participants
      WHERE tournament_id = ?
    `, [tournamentId]);
    
    if (participantCount.count >= tournament.max_participants) {
      return reply.status(400).send({ 
        success: false, 
        error: 'Tournament is full' 
      });
    }
    
    // Check if user is already registered
    const existingRegistration = await db.get(`
      SELECT * FROM tournament_participants
      WHERE tournament_id = ? AND user_id = ?
    `, [tournamentId, userId]);
    
    if (existingRegistration) {
      return reply.status(400).send({ 
        success: false, 
        error: 'You are already registered for this tournament' 
      });
    }
    
    // Register user
    await db.run(`
      INSERT INTO tournament_participants (tournament_id, user_id)
      VALUES (?, ?)
    `, [tournamentId, userId]);
    
    return reply.send({ 
      success: true, 
      message: 'Successfully registered for tournament' 
    });
  } catch (error) {
    console.error('Error registering for tournament:', error);
    return reply.status(500).send({ 
      success: false, 
      error: 'Failed to register for tournament' 
    });
  }
}

export async function unregisterFromTournament(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  if (!request.params.id) {
    return reply.status(400).send({
      success: false,
      error: 'Match ID is required'
    });
  }
  const tournamentId = parseInt(request.params.id);
  const userId = request.user.id;
  const db = await getDb();
  
  try {
    // Check if tournament exists and is in registration phase
    const tournament = await db.get(`
      SELECT * FROM tournaments 
      WHERE id = ? AND status = 'pending'
    `, [tournamentId]);
    
    if (!tournament) {
      return reply.status(400).send({ 
        success: false, 
        error: 'Tournament not found or registration closed' 
      });
    }
    
    // Unregister user
    const result = await db.run(`
      DELETE FROM tournament_participants
      WHERE tournament_id = ? AND user_id = ?
    `, [tournamentId, userId]);
    
    if (result.changes === 0) {
      return reply.status(400).send({ 
        success: false, 
        error: 'You are not registered for this tournament' 
      });
    }
    
    return reply.send({ 
      success: true, 
      message: 'Successfully unregistered from tournament' 
    });
  } catch (error) {
    console.error('Error unregistering from tournament:', error);
    return reply.status(500).send({ 
      success: false, 
      error: 'Failed to unregister from tournament' 
    });
  }
}

export async function getUserTournaments(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  const userId = request.user.id;
  const db = await getDb();
  
  try {
    const tournaments = await db.all(`
      SELECT t.*, tp.status as participant_status
      FROM tournaments t
      JOIN tournament_participants tp ON t.id = tp.tournament_id
      WHERE tp.user_id = ?
      ORDER BY t.start_date DESC
    `, [userId]);
    
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
    const match = await db.get(`
      SELECT * FROM tournament_matches
      WHERE id = ? AND (player1_id = ? OR player2_id = ?)
      AND status IN ('scheduled', 'in_progress')
    `, [matchId, userId, userId]);
    
    if (!match) {
      return reply.status(404).send({ 
        success: false, 
        error: 'Match not found or you are not a participant' 
      });
    }
    
    let gameId = match.game_id;
    
    // If match doesn't have a game yet, create one
    if (!gameId) {
      gameId = gameManager.createGame('remote');
      
      // Update match with game ID and status
      await db.run(`
        UPDATE tournament_matches
        SET game_id = ?, status = 'in_progress', match_date = datetime('now')
        WHERE id = ?
      `, [gameId, matchId]);
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
  const { name, description, start_date, end_date, max_participants } = request.body as any;
  const db = await getDb();
  
  try {
    const result = await db.run(`
      INSERT INTO tournaments (name, description, start_date, end_date, max_participants, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `, [name, description, start_date, end_date, max_participants || 8]);
    
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

// Admin function to start a tournament
export async function startTournament(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  if (!request.params.id) {
    return reply.status(400).send({
      success: false,
      error: 'Match ID is required'
    });
  }

  const tournamentId = parseInt(request.params.id);
  const db = await getDb();
  
  try {
    await db.run('BEGIN TRANSACTION');
    
    // Update tournament status
    await db.run(`
      UPDATE tournaments
      SET status = 'active'
      WHERE id = ? AND status = 'pending'
    `, [tournamentId]);
    
    // Get participants
    const participants = await db.all(`
      SELECT tp.user_id, ps.elo_rating
      FROM tournament_participants tp
      LEFT JOIN player_stats ps ON tp.user_id = ps.user_id
      WHERE tp.tournament_id = ?
      ORDER BY ps.elo_rating DESC NULLS LAST
    `, [tournamentId]);
    
    // Generate matches based on seeding (simple bracket)
    // This implementation assumes a power of 2 number of participants
    // In a real implementation, you might need byes for incomplete brackets
    
    const numberOfParticipants = participants.length;
    const rounds = Math.ceil(Math.log2(numberOfParticipants));
    
    // Generate first round matches
    for (let i = 0; i < Math.floor(numberOfParticipants / 2); i++) {
      const player1 = participants[i];
      const player2 = participants[numberOfParticipants - 1 - i];
      
      await db.run(`
        INSERT INTO tournament_matches 
        (tournament_id, round, match_number, player1_id, player2_id, status)
        VALUES (?, 1, ?, ?, ?, 'scheduled')
      `, [tournamentId, i + 1, player1.user_id, player2.user_id]);
    }
    
    // Handle possible bye if odd number of participants
    if (numberOfParticipants % 2 !== 0) {
      const middleIndex = Math.floor(numberOfParticipants / 2);
      await db.run(`
        INSERT INTO tournament_matches 
        (tournament_id, round, match_number, player1_id, player2_id, status, winner_id)
        VALUES (?, 1, ?, ?, NULL, 'completed', ?)
      `, [tournamentId, Math.floor(numberOfParticipants / 2) + 1, participants[middleIndex].user_id, participants[middleIndex].user_id]);
    }
    
    // Create empty matches for future rounds
    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      
      for (let match = 1; match <= matchesInRound; match++) {
        await db.run(`
          INSERT INTO tournament_matches 
          (tournament_id, round, match_number, status)
          VALUES (?, ?, ?, 'scheduled')
        `, [tournamentId, round, match]);
      }
    }
    
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
    const match = await db.get(`
      SELECT * FROM tournament_matches
      WHERE game_id = ?
    `, [gameId]);
    
    if (!match) return;
    
    await db.run('BEGIN TRANSACTION');
    
    // Update match result
    await db.run(`
      UPDATE tournament_matches
      SET winner_id = ?, status = 'completed'
      WHERE id = ?
    `, [winnerId, match.id]);
    
    // Update participant status
    const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
    
    await db.run(`
      UPDATE tournament_participants
      SET status = 'eliminated'
      WHERE tournament_id = ? AND user_id = ?
    `, [match.tournament_id, loserId]);
    
    // If this is the final match, update tournament and winner
    const maxRound = await getMaxRound(db, match.tournament_id);
    if (match.round === maxRound) {
      await db.run(`
        UPDATE tournaments
        SET status = 'completed'
        WHERE id = ?
      `, [match.tournament_id]);
      
      await db.run(`
        UPDATE tournament_participants
        SET status = 'winner'
        WHERE tournament_id = ? AND user_id = ?
      `, [match.tournament_id, winnerId]);
    } else {
      // Otherwise, advance winner to next round
      await advanceToNextRound(db, match, winnerId);
    }
    
    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error updating tournament match result:', error);
  }
}

// Helper to get max round in tournament
async function getMaxRound(db: Database, tournamentId: number | string): Promise<number> {
  const result = await db.get(`
    SELECT MAX(round) as max_round FROM tournament_matches
    WHERE tournament_id = ?
  `, [tournamentId]);
  
  return result.max_round;
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
  const nextRound = match.round + 1;
  const nextMatchNumber = Math.ceil(match.match_number / 2);
  
  // Check if we're putting the player in player1 or player2 slot
  const isPlayer1 = match.match_number % 2 !== 0;
  
  if (isPlayer1) {
    await db.run(`
      UPDATE tournament_matches
      SET player1_id = ?
      WHERE tournament_id = ? AND round = ? AND match_number = ?
    `, [winnerId, match.tournament_id, nextRound, nextMatchNumber]);
  } else {
    await db.run(`
      UPDATE tournament_matches
      SET player2_id = ?
      WHERE tournament_id = ? AND round = ? AND match_number = ?
    `, [winnerId, match.tournament_id, nextRound, nextMatchNumber]);
  }
  
  // Check if both players are set for the next match
  const nextMatch = await db.get(`
    SELECT * FROM tournament_matches
    WHERE tournament_id = ? AND round = ? AND match_number = ?
  `, [match.tournament_id, nextRound, nextMatchNumber]);
  
  // If both players are set, update status to ready
  if (nextMatch.player1_id && nextMatch.player2_id) {
    await db.run(`
      UPDATE tournament_matches
      SET status = 'scheduled'
      WHERE id = ?
    `, [nextMatch.id]);
  }
}