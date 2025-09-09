import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../@types/fastify';
import { getDb } from '../db';
import { gameManager } from '../game/GameManager';
import { Database } from 'sqlite';
import Tournament from '../models/tournament';
import { onlineUsers } from '../game/ws.types.js';
import { GameState } from "../game/PongGame";
import  GameStats from '../models/game.stats';
import { getUserParticipantIdInMatch} from './game.controller';

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
  excludeUserId?: string
): Promise<void> {
  try {
    const participants = await Tournament.getTournamentParticipants(db, tournamentId);
    // console.log('participants:', participants);
    
    for (const participant of participants) {
      if (excludeUserId && participant.user_id === excludeUserId) {
        continue;
      }
      
      // console.log(`[tour.controller.ts] notifyTourParticipant: ${participant.user_id}`);
      const participantSocket = onlineUsers.get(participant.user_id);
      const userTournaments = await Tournament.findTournamentsByUserId(db, participant.user_id);
      if (participantSocket && participantSocket.readyState === WebSocket.OPEN) {
        // console.log('notifying:', participant.user_id);
        participantSocket.send(JSON.stringify({
          type: eventType,
          data: { ...eventData, userTournaments }
        }));
      } else {
        console.log('unable to notify:', participant.user_id);
      }
    }
  } catch (error) {
    console.error('Error notifying tournament participants:', error);
  }
}

async function notifyMatchUpdate(db: Database, tournamentId: number, matchId: number): Promise<void> {
  try {
    console.log('Notifying match update:', tournamentId, matchId);
    const match = await Tournament.getMatchForFrontend(db, tournamentId, matchId);

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

    await Tournament.addParticipant(db, tournamentId, userId, ua, oa);
    const newParticipantCount = await Tournament.getParticipantCount(db, tournamentId);

    let tournamentStarted = false;
    if (newParticipantCount === 4) {
      await startTournamentInternal(db, tournamentId, tournament.mode);
      tournamentStarted = true;
    }

    await notifyTournamentParticipants(
      db,
      tournamentId,
      'participant-joined',
      {
        tournamentId,
        message: tournament.mode == 'local' ? `${ua} and ${oa} have joined the tournament!` : `${ua} has joined the tournament!`
      },
      userId 
    );
    
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

async function startTournamentInternal(db: Database, tournamentId: number, mode: 'local' | 'remote'): Promise<void> {
  try {
    await Tournament.updateTournamentStatus(db, tournamentId, 'active');
    await Tournament.updateAllParticipantStatus(db, tournamentId, 'active');

    const participants = await Tournament.getParticipantsForSeeding(db, tournamentId);

    if (mode === 'local') {
      const hosts = participants.filter(p => !p.is_guest);
      const guests = participants.filter(p => p.is_guest);

      const host1 = hosts[0];
      const guest1 = guests.find(g => g.host_id === host1.id);
      if (!host1 || !guest1) {
          throw new Error('Could not find sufficient host/guest pairs for local tournament seeding (Match 1).');
      }
      await Tournament.createMatch(db, tournamentId, mode, 1, 1, host1.id, guest1.id);

      const host2 = hosts[1];
      const guest2 = guests.find(g => g.host_id === host2.id);
      if (!host2 || !guest2) {
          throw new Error('Could not find sufficient host/guest pairs for local tournament seeding (Match 2).');
      }
      await Tournament.createMatch(db, tournamentId, mode, 1, 2, host2.id, guest2.id);
    } else {
      await Tournament.createMatch(db, tournamentId, mode, 1, 1, participants[0].id, participants[3].id);
      await Tournament.createMatch(db, tournamentId, mode, 1, 2, participants[1].id, participants[2].id);
    }

    await Tournament.createMatch(db, tournamentId, mode, 2, 1, null, null);

    const updatedTournament = await Tournament.findById(db, tournamentId);
    const matches = await Tournament.getTournamentMatches(db, tournamentId);

    await notifyTournamentParticipants(
      db,
      tournamentId,
      'tournament-started',
      {
        tournamentId,
        tournament: updatedTournament,
        matches,
        message: 'The tournament has started! The bracket is now available.'
      }
    );
  } catch (error) {
    console.error('Error in startTournamentInternal:', error);
    throw error;
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

    const currentParticipantId = await getUserParticipantIdInMatch(db, match, userId);

    if (currentParticipantId === null) {
      return reply.status(400).send({
        success: false,
        error: 'Could not determine your participant ID for this match context.'
      });
    }

    let gameId = match.game_id;

    if (!gameId) {
      gameId = await gameManager.createGame(match.tournament_mode, matchId);
      if (!gameId) {
        throw new Error(`Failed to create GameRoom for matchId=${matchId}`);
      }
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
    userId: string,
    opponentUserId: string,
    winnerUserId: string,
    gameId: string,
    withinTransaction: boolean = false
  ) {
    let transactionStarted = false;
    try {
      if (!withinTransaction) {
        await db.run('BEGIN TRANSACTION');
        transactionStarted = true;
      }

      const result: 'win' | 'loss' = winnerUserId === userId ? 'win' : 'loss';
      await GameStats.updateMatches(db, userId, result);
      await GameStats.updatePlayerElo(db, userId, opponentUserId, winnerUserId === userId ? 1 : 0);
      await GameStats.updateWinStreak(db, userId, winnerUserId === userId);

      if (transactionStarted) {
          await db.run('COMMIT');
      }
    } catch (error) {
      if (transactionStarted) {
          await db.run('ROLLBACK');
      }
      console.error(`Error processing user game results for user ${userId} in game ${gameId}:`, error);
      throw error;
    }
  }

export async function updateTournamentMatchResult(
    gameId: string,
    winnerParticipantId: number,
    finalState: GameState,
    gameLeftParticipantId: number,
    gameRightParticipantId: number
): Promise<void> {
  const db = await getDb();

  try {
    const match = await Tournament.findMatchByGameId(db, gameId);
    if (!match) {
        console.warn(`Tournament match with game ID ${gameId} not found for result update.`);
        return;
    }

    await db.run('BEGIN TRANSACTION');

    await Tournament.setMatchWinner(db, match.id, winnerParticipantId);

    const loserParticipantId = winnerParticipantId === gameLeftParticipantId ? gameRightParticipantId : gameLeftParticipantId;

    await Tournament.setParticipantStatus(db, match.tournament_id, loserParticipantId, 'eliminated');

    await notifyMatchUpdate(db, match.tournament_id, match.id);

    console.log('[updateTournamentMatchResult] gameId:', gameId);
    console.log('matchId:', match.id);
    console.log(`winner: ${winnerParticipantId} | loser: ${loserParticipantId}`);

    if (match.mode === 'remote') {
      await updateRemoteTourStats(db, match, winnerParticipantId, loserParticipantId, finalState, gameLeftParticipantId, gameRightParticipantId);
    } else {
        console.log(`Local tournament match completed. Elo/Match History not updated for local mode.`);
    }

    if (match.round === 2) {
      await announceFinalMatchResult(db, match, winnerParticipantId);
    } else {
      await advanceToNextRound(db, match, winnerParticipantId);
    }

    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error updating tournament match result:', error);
  }
}

async function updateRemoteTourStats(
    db: Database,
    match: any,
    winnerParticipantId: number,
    loserParticipantId: number,
    finalState: GameState,
    gameLeftParticipantId: number,
    gameRightParticipantId: number
): Promise<void> {    
    const [winnerUserId, loserUserId, leftSideUserId, rightSideUserId] = await Promise.all([
        Tournament.getUserIdByParticipantId(db, winnerParticipantId),
        Tournament.getUserIdByParticipantId(db, loserParticipantId),
        Tournament.getUserIdByParticipantId(db, gameLeftParticipantId),
        Tournament.getUserIdByParticipantId(db, gameRightParticipantId)
    ]);

    if (!winnerUserId || !loserUserId) {
        throw new Error(`Could not retrieve user IDs for participants ${winnerParticipantId} and ${loserParticipantId}`);
    }

    console.log(`Updating Elo and Match History for remote tournament game between user ${winnerUserId} and ${loserUserId}`);

    if (leftSideUserId && rightSideUserId) {
        await GameStats.recordGameResult(
            db,
            leftSideUserId,
            rightSideUserId,
            winnerUserId,
            finalState.scoreLeft,
            finalState.scoreRight,
            match.tournament_id
        );
    } else {
        console.error(`Could not retrieve user IDs for left/right side participants (${gameLeftParticipantId}, ${gameRightParticipantId}). Cannot record detailed game result.`);
    }

    await Promise.all([
        processUserGameResults(db, winnerUserId, loserUserId, winnerUserId, match.game_id, true),
        processUserGameResults(db, loserUserId, winnerUserId, winnerUserId, match.game_id, true)
    ]);
}

async function announceFinalMatchResult(db: any, match: any, winnerParticipantId: number) {
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
}

async function advanceToNextRound(
  db: Database,
  match: {
    tournament_id: number;
    round: number;
    match_number: number;
    id?: number;
  },
  winnerParticipantId: number
): Promise<void> {
  if (match.round === 1) {
    const isPlayer1InFinalMatch = match.match_number === 1;

    await Tournament.updateMatchPlayer(
        db,
        match.tournament_id,
        2,
        1,
        isPlayer1InFinalMatch,
        winnerParticipantId
    );

    const finalMatch = await Tournament.getFinalMatch(db, match.tournament_id);
    if (finalMatch && finalMatch.player1_participant_id && finalMatch.player2_participant_id) {
      console.log(`Final match ${finalMatch.id} is ready with participants:`, finalMatch.player1_participant_id, finalMatch.player2_participant_id);  
      await db.run(`
        UPDATE tournament_matches
        SET status = 'scheduled'
        WHERE id = ?
      `, [finalMatch.id]);

      await notifyMatchUpdate(db, match.tournament_id, finalMatch.id);
    }
  }
}
