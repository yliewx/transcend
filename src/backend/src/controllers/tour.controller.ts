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
      WHERE t.status != 'cancelled' and t.status != 'completed'
      GROUP BY t.id
      ORDER BY t.created_at DESC
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
      error: 'Tournament ID is required'
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
        u2.username as player2_username,
        tp1.alias as player1_alias,
        tp2.alias as player2_alias
      FROM tournament_matches tm
      LEFT JOIN users u1 ON tm.player1_id = u1.id
      LEFT JOIN users u2 ON tm.player2_id = u2.id
      LEFT JOIN tournament_participants tp1 ON (tm.player1_id = tp1.user_id AND tm.tournament_id = tp1.tournament_id)
      LEFT JOIN tournament_participants tp2 ON (tm.player2_id = tp2.user_id AND tm.tournament_id = tp2.tournament_id)
      WHERE tm.tournament_id = ?
      ORDER BY tm.round, tm.match_number
    `, [tournamentId]);
    
    // Get participants
    const participants = await db.all(`
      SELECT u.id, u.username, ps.elo_rating as elo, tp.status, tp.alias
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
    const tournament = await db.get(`
      SELECT * FROM tournaments 
      WHERE id = ? AND status = 'pending'
    `, [tournamentId]);
    
    if (!tournament) {
      await db.run('ROLLBACK');
      return reply.status(400).send({ 
        success: false, 
        error: 'Tournament not found or registration closed' 
      });
    }
    
    // Check if user is already registered
    const existingRegistration = await db.get(`
      SELECT * FROM tournament_participants
      WHERE tournament_id = ? AND user_id = ?
    `, [tournamentId, userId]);
    
    if (existingRegistration) {
      await db.run('ROLLBACK');
      return reply.status(400).send({ 
        success: false, 
        error: 'You are already registered for this tournament' 
      });
    }
    
    // Check if alias is already taken in this tournament
    const existingAlias = await db.get(`
      SELECT * FROM tournament_participants
      WHERE tournament_id = ? AND alias = ?
    `, [tournamentId, alias.trim()]);
    
    if (existingAlias) {
      await db.run('ROLLBACK');
      return reply.status(400).send({ 
        success: false, 
        error: 'This alias is already taken in this tournament. Please choose another one.' 
      });
    }
    
    // Check if tournament is full (now always 4 players)
    const participantCount = await db.get(`
      SELECT COUNT(*) as count FROM tournament_participants
      WHERE tournament_id = ?
    `, [tournamentId]);
    
    if (participantCount.count >= 4) {
      await db.run('ROLLBACK');
      return reply.status(400).send({ 
        success: false, 
        error: 'Tournament is full' 
      });
    }
    
    // Register user with alias
    await db.run(`
      INSERT INTO tournament_participants (tournament_id, user_id, alias)
      VALUES (?, ?, ?)
    `, [tournamentId, userId, alias.trim()]);
    
    // Check if we've reached 4 participants after registration
    const newParticipantCount = await db.get(`
      SELECT COUNT(*) as count FROM tournament_participants
      WHERE tournament_id = ?
    `, [tournamentId]);
    
    // If we have exactly 4 participants, start the tournament automatically
    if (newParticipantCount.count === 4) {
      // Start tournament logic
      await startTournamentInternal(db, tournamentId);
    }
    
    await db.run('COMMIT');
    
    return reply.send({ 
      success: true, 
      message: 'Successfully registered for tournament',
      tournament_started: newParticipantCount.count === 4
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

// export async function getUserTournaments(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
//   const userId = request.user.id;
//   const db = await getDb();
//   try {
//     const tournaments = await db.all(`
//       SELECT t.*, tp.status as participant_status, tp.alias
//       FROM tournaments t
//       JOIN tournament_participants tp ON t.id = tp.tournament_id
//       WHERE tp.user_id = ?
//       ORDER BY t.created_at DESC
//     `, [userId]);
    
//     return reply.send({ success: true, tournaments });
//   } catch (error) {
//     console.error('Error fetching user tournaments:', error);
//     return reply.status(500).send({ 
//       success: false, 
//       error: 'Failed to fetch your tournaments' 
//     });
//   }
// }

export async function getUserTournaments(request: AuthenticatedRequest, reply: FastifyReply): Promise<FastifyReply> {
  const userId = request.user.id;
  const db = await getDb();
  try {
    // Modified query to include current_participants count
    const tournaments = await db.all(`
      SELECT 
        t.*, 
        tp.status as participant_status, 
        tp.alias,
        (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as current_participants
      FROM tournaments t
      JOIN tournament_participants tp ON t.id = tp.tournament_id
      WHERE tp.user_id = ?
      ORDER BY t.created_at DESC
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
        SET game_id = ?, status = 'in_progress'
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
  const { name, description } = request.body as any;
  const db = await getDb();
  
  try {
    const result = await db.run(`
      INSERT INTO tournaments (name, description, status)
      VALUES (?, ?, 'pending')
    `, [name, description]);
    
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
    await db.run(`
      UPDATE tournaments
      SET status = 'active'
      WHERE id = ?
    `, [tournamentId]);
    
    // Check for any participants missing aliases and generate default ones if needed
    const participantsWithMissingAliases = await db.all(`
      SELECT tp.id, u.username 
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = ? AND (tp.alias IS NULL OR tp.alias = '')
    `, [tournamentId]);
    
    // Generate and set default aliases for participants who didn't set one
    for (const participant of participantsWithMissingAliases) {
      const defaultAlias = `Player_${participant.username.substring(0, 8)}`;
      await db.run(`
        UPDATE tournament_participants
        SET alias = ?
        WHERE id = ?
      `, [defaultAlias, participant.id]);
    }
    
    // Mark all participants as active
    await db.run(`
      UPDATE tournament_participants
      SET status = 'active'
      WHERE tournament_id = ?
    `, [tournamentId]);
    
    // Get participants with their ELO ratings
    const participants = await db.all(`
      SELECT tp.user_id, ps.elo_rating
      FROM tournament_participants tp
      LEFT JOIN player_stats ps ON tp.user_id = ps.user_id
      WHERE tp.tournament_id = ?
      ORDER BY ps.elo_rating DESC NULLS LAST
    `, [tournamentId]);
    
    // Since there are always 4 participants, we'll organize 2 semifinal matches
    
    // Semifinal 1: 1st seed vs 4th seed
    await db.run(`
      INSERT INTO tournament_matches 
      (tournament_id, round, match_number, player1_id, player2_id, status)
      VALUES (?, 1, 1, ?, ?, 'scheduled')
    `, [tournamentId, participants[0].user_id, participants[3].user_id]);
    
    // Semifinal 2: 2nd seed vs 3rd seed
    await db.run(`
      INSERT INTO tournament_matches 
      (tournament_id, round, match_number, player1_id, player2_id, status)
      VALUES (?, 1, 2, ?, ?, 'scheduled')
    `, [tournamentId, participants[1].user_id, participants[2].user_id]);
    
    // Create empty final match (round 2)
    await db.run(`
      INSERT INTO tournament_matches 
      (tournament_id, round, match_number, status)
      VALUES (?, 2, 1, 'scheduled')
    `, [tournamentId]);
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
    const participantCount = await db.get(`
      SELECT COUNT(*) as count FROM tournament_participants
      WHERE tournament_id = ?
    `, [tournamentId]);
    
    if (participantCount.count !== 4) {
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
    
    // Update participant status for the loser
    const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
    
    await db.run(`
      UPDATE tournament_participants
      SET status = 'eliminated'
      WHERE tournament_id = ? AND user_id = ?
    `, [match.tournament_id, loserId]);
    
    // If this is the final match (round 2), update tournament and winner
    if (match.round === 2) {
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
    if (match.match_number === 1) {
      // First semifinal winner goes to final as player1
      await db.run(`
        UPDATE tournament_matches
        SET player1_id = ?
        WHERE tournament_id = ? AND round = 2 AND match_number = 1
      `, [winnerId, match.tournament_id]);
    } else if (match.match_number === 2) {
      // Second semifinal winner goes to final as player2
      await db.run(`
        UPDATE tournament_matches
        SET player2_id = ?
        WHERE tournament_id = ? AND round = 2 AND match_number = 1
      `, [winnerId, match.tournament_id]);
    }
    
    // Check if both players are set for the final match
    const finalMatch = await db.get(`
      SELECT * FROM tournament_matches
      WHERE tournament_id = ? AND round = 2 AND match_number = 1
    `, [match.tournament_id]);
    
    // If both players are set, update status to ready
    if (finalMatch.player1_id && finalMatch.player2_id) {
      await db.run(`
        UPDATE tournament_matches
        SET status = 'scheduled'
        WHERE id = ?
      `, [finalMatch.id]);
    }
  }
}