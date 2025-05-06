import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../@types/fastify';
import { getDb } from '../db';
import { gameManager } from '../game/GameManager';
import { Database } from 'sqlite';
import Tournament from '../models/tournament';
import { onlineUsers } from '../game/ws.types.js';

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
      LEFT JOIN tournament_participants tp1 ON tm.player1_id = tp1.user_id AND tp1.tournament_id = tm.tournament_id
      LEFT JOIN tournament_participants tp2 ON tm.player2_id = tp2.user_id AND tp2.tournament_id = tm.tournament_id
      LEFT JOIN users u1 ON tm.player1_id = u1.id
      LEFT JOIN users u2 ON tm.player2_id = u2.id
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
    const tournaments = await Tournament.findActiveTournaments(db);
    return reply.send({ success: true, tournaments });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return reply.status(400).send({ success: false, error: 'Failed to fetch tournaments' });
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
  
  if (!alias || typeof alias !== 'string' || alias.trim() === '' || alias.length < 3 || alias.length > 20) {
    return reply.status(400).send({
      success: false,
      error: 'A valid alias between 3 to 20 characters is required to join a tournament'
    });
  }

  const db = await getDb();
  
  try {
    await db.run('BEGIN TRANSACTION');
    
    const tournament = await Tournament.isPendingTournament(db, tournamentId);
    
    if (!tournament) {
      await db.run('ROLLBACK');
      return reply.status(400).send({ 
        success: false, 
        error: 'Tournament not found or registration closed' 
      });
    }
    
    const existingRegistration = await Tournament.isUserRegistered(db, tournamentId, userId);
    
    if (existingRegistration) {
      await db.run('ROLLBACK');
      return reply.status(400).send({ 
        success: false, 
        error: 'You are already registered for this tournament' 
      });
    }
    
    const existingAlias = await Tournament.isAliasTaken(db, tournamentId, alias);
    
    if (existingAlias) {
      await db.run('ROLLBACK');
      return reply.status(400).send({ 
        success: false, 
        error: 'This alias is already taken in this tournament. Please choose another one.' 
      });
    }
    
    const participantCount = await Tournament.getParticipantCount(db, tournamentId);
    
    if (participantCount >= 4) {
      await db.run('ROLLBACK');
      return reply.status(400).send({ 
        success: false, 
        error: 'Tournament is full' 
      });
    }
    
    const newParticipantCount = await Tournament.addParticipant(db, tournamentId, userId, alias);
    
    const userData = await db.get(
      `SELECT u.id, u.username, p.display_name
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = ?`,
      userId
    );
    
    const newParticipant = {
      id: userId,
      username: userData.username,
      alias: alias,
      elo: 1000,
      status: 'active'
    };
    
    await notifyTournamentParticipants(
      db,
      tournamentId,
      'participant-joined',
      {
        tournamentId,
        participant: newParticipant,
        message: `${alias} has joined the tournament!`
      },
      userId 
    );
    
    let tournamentStarted = false;
    if (newParticipantCount === 4) {
      await startTournamentInternal(db, tournamentId);
      tournamentStarted = true;
    }
    
    await db.run('COMMIT');

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
    return reply.status(400).send({ 
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
    return reply.status(400).send({ 
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
    const match = await Tournament.getMatchForPlayer(db, matchId, userId);
    
    if (!match) {
      return reply.status(404).send({ 
        success: false, 
        error: 'Match not found or you are not a participant' 
      });
    }
    
    let gameId = match.game_id;
    
    if (!gameId) {
      gameId = gameManager.createGame('remote', true);
      console.log('Created new game:', gameId);
      await Tournament.setMatchGameId(db, matchId, gameId);      
      await notifyMatchUpdate(db, match.tournament_id, matchId);
    }
    
    return reply.send({ success: true, gameId });
  } catch (error) {
    console.error('Error joining tournament match:', error);
    return reply.status(400).send({ 
      success: false, 
      error: 'Failed to join match' 
    });
  }
}

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
    return reply.status(400).send({ 
      success: false, 
      error: 'Failed to create tournament' 
    });
  }
}

async function startTournamentInternal(db: Database, tournamentId: number): Promise<void> {
  try {
    await Tournament.updateStatus(db, tournamentId, 'active');
    
    await db.run(`
      UPDATE tournament_participants
      SET status = 'active'
      WHERE tournament_id = ?
    `, [tournamentId]);
    
    const participants = await Tournament.getParticipantsForSeeding(db, tournamentId);
    await Tournament.createMatch(db, tournamentId, 1, 1, participants[0].user_id, participants[3].user_id);    
    await Tournament.createMatch(db, tournamentId, 1, 2, participants[1].user_id, participants[2].user_id);    
    await Tournament.createMatch(db, tournamentId, 2, 1);

    const tournament = await Tournament.findById(db, tournamentId);    
    const matches = await Tournament.getTournamentMatches(db, tournamentId);
    
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
    return reply.status(400).send({ 
      success: false, 
      error: 'Failed to start tournament' 
    });
  }
}

export async function updateTournamentMatchResult(gameId: string, winnerId: number): Promise<void> {
  const db = await getDb();
  
  try {
    const match = await Tournament.findMatchByGameId(db, gameId);
    if (!match) return;
    
    await db.run('BEGIN TRANSACTION');
    
    await Tournament.setMatchWinner(db, match.id, winnerId);
    
    const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
    await Tournament.setParticipantStatus(db, match.tournament_id, loserId, 'eliminated');
    
    await notifyMatchUpdate(db, match.tournament_id, match.id);
    
    if (match.round === 2) {
      await Tournament.updateStatus(db, match.tournament_id, 'completed');
      await Tournament.setParticipantStatus(db, match.tournament_id, winnerId, 'winner');
      
      const tournament = await Tournament.findById(db, match.tournament_id);
      const matches = await Tournament.getTournamentMatches(db, match.tournament_id);
      const participants = await Tournament.getTournamentParticipants(db, match.tournament_id);
      const winner = participants.find((p: any) => p.id === winnerId);
      
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
      await advanceToNextRound(db, match, winnerId);
    }
    
    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error updating tournament match result:', error);
  }
}

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
  if (match.round === 1) {
    const isPlayer1 = match.match_number === 1;
    
    await Tournament.updateMatchPlayer(db, match.tournament_id, 2, 1, isPlayer1, winnerId);
    
    const finalMatch = await Tournament.getFinalMatch(db, match.tournament_id);
    
    if (finalMatch.player1_id && finalMatch.player2_id) {
      await db.run(`
        UPDATE tournament_matches
        SET status = 'scheduled'
        WHERE id = ?
      `, [finalMatch.id]);
      
      await notifyMatchUpdate(db, match.tournament_id, finalMatch.id);
    }
  }
}