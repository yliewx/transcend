/*
import { Database } from 'sqlite';

interface TournamentData {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  max_participants: number;
  created_at: string;
}

interface ParticipantData {
  id: number;
  user_id: number;
  username: string;
  display_name: string | null;
  status: 'registered' | 'active' | 'eliminated' | 'winner';
  seed: number | null;
  elo_rating: number;
}

interface MatchData {
  id: number;
  tournament_id: number;
  round: number;
  match_number: number;
  game_id: string | null;
  player1_id: number | null;
  player1_name: string | null;
  player2_id: number | null;
  player2_name: string | null;
  winner_id: number | null;
  winner_name: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_time: string | null;
  player1_score: number | null;
  player2_score: number | null;
}

export default class Tournament {
  static async getAllTournaments(db: Database): Promise<TournamentData[]> {
    return db.all(`
      SELECT * FROM tournaments
      ORDER BY start_date DESC
    `);
  }

  static async getTournamentById(db: Database, id: number): Promise<TournamentData | undefined> {
    return db.get(`
      SELECT * FROM tournaments
      WHERE id = ?
    `, [id]);
  }

  static async createTournament(
    db: Database,
    name: string,
    description: string,
    startDate: string,
    endDate: string,
    maxParticipants: number = 16
  ): Promise<number> {
    const result = await db.run(`
      INSERT INTO tournaments (name, description, start_date, end_date, max_participants, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `, [name, description, startDate, endDate, maxParticipants]);
    
    return result.lastID!;
  }

  static async getTournamentParticipants(db: Database, tournamentId: number): Promise<ParticipantData[]> {
    return db.all(`
      SELECT tp.id, tp.user_id, u.username, p.display_name, tp.status, tp.seed, 
        COALESCE(ur.elo_rating, 1000) as elo_rating
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN user_ratings ur ON u.id = ur.user_id
      WHERE tp.tournament_id = ?
      ORDER BY tp.seed NULLS LAST, elo_rating DESC
    `, [tournamentId]);
  }

  static async getTournamentMatches(db: Database, tournamentId: number): Promise<MatchData[]> {
    return db.all(`
      SELECT 
        tm.id, tm.tournament_id, tm.round, tm.match_number,
        tm.player1_id, tm.player2_id, tm.winner_id, tm.status, tm.game_id, tm.scheduled_time,
        u1.username as player1_name, u2.username as player2_name, uw.username as winner_name,
        mh.left_score as player1_score, mh.right_score as player2_score
      FROM tournament_matches tm
      LEFT JOIN users u1 ON tm.player1_id = u1.id
      LEFT JOIN users u2 ON tm.player2_id = u2.id
      LEFT JOIN users uw ON tm.winner_id = uw.id
      LEFT JOIN match_history mh ON tm.game_id = mh.id
      WHERE tm.tournament_id = ?
      ORDER BY tm.round, tm.match_number
    `, [tournamentId]);
  }

  static async getParticipantCount(db: Database, tournamentId: number): Promise<number> {
    const result = await db.get(`
      SELECT COUNT(*) as count 
      FROM tournament_participants 
      WHERE tournament_id = ?
    `, [tournamentId]);
    
    return result.count;
  }

  static async isUserRegistered(db: Database, tournamentId: number, userId: number): Promise<boolean> {
    const result = await db.get(`
      SELECT COUNT(*) as count 
      FROM tournament_participants 
      WHERE tournament_id = ? AND user_id = ?
    `, [tournamentId, userId]);
    
    return result.count > 0;
  }

  static async registerUser(db: Database, tournamentId: number, userId: number): Promise<void> {
    await db.run(`
      INSERT INTO tournament_participants (tournament_id, user_id, status)
      VALUES (?, ?, 'registered')
    `, [tournamentId, userId]);
  }

  static async updateTournamentStatus(db: Database, tournamentId: number, status: TournamentData['status']): Promise<void> {
    await db.run(`
      UPDATE tournaments 
      SET status = ? 
      WHERE id = ?
    `, [status, tournamentId]);
  }

  static async sortParticipantsByElo(db: Database, participants: ParticipantData[]): Promise<ParticipantData[]> {
    // Get ELO ratings for all participants
    for (const participant of participants) {
      if (!participant.elo_rating) {
        const rating = await db.get(`
          SELECT elo_rating FROM user_ratings WHERE user_id = ?
        `, [participant.user_id]);
        
        participant.elo_rating = rating?.elo_rating || 1000;
      }
    }
    
    // Sort by ELO rating descending
    return participants.sort((a, b) => b.elo_rating - a.elo_rating);
  }

  static async createTournamentBracket(db: Database, tournamentId: number, participants: ParticipantData[]): Promise<void> {
    // Update participant seeds based on ELO ranking
    for (let i = 0; i < participants.length; i++) {
      await db.run(`
        UPDATE tournament_participants
        SET seed = ?, status = 'active'
        WHERE tournament_id = ? AND user_id = ?
      `, [i + 1, tournamentId, participants[i].user_id]);
    }
    
    // Number of rounds needed for the tournament
    const numParticipants = participants.length;
    const numRounds = Math.ceil(Math.log2(numParticipants));
    
    // Create matches for the first round
    const totalFirstRoundMatches = Math.pow(2, numRounds - 1);
    const numByes = totalFirstRoundMatches * 2 - numParticipants;
    
    // Assign players to first round matches using seeding
    let matchParticipants: Array<{ match: number, seed1: number, seed2: number | null }> = [];
    
    // Create bracketing based on seeding
    // Top seeds get byes in the first round if number of participants is not a power of 2
    for (let i = 0; i < totalFirstRoundMatches; i++) {
      const seed1 = i + 1;
      const seed2Index = numParticipants - i - 1;
      
      // If seed2 would be invalid or if it's a bye match for a top seed
      if (seed2Index >= numParticipants || seed2Index < 0 || i < numByes) {
        matchParticipants.push({ match: i + 1, seed1, seed2: null });
      } else {
        matchParticipants.push({ match: i + 1, seed1, seed2: seed2Index + 1 });
      }
    }
    
    // Create first round matches
    for (const matchPair of matchParticipants) {
      const player1 = participants.find(p => p.seed === matchPair.seed1);
      const player2 = matchPair.seed2 ? participants.find(p => p.seed === matchPair.seed2) : null;
      
      await db.run(`
        INSERT INTO tournament_matches 
        (tournament_id, round, match_number, player1_id, player2_id, status)
        VALUES (?, 1, ?, ?, ?, 'scheduled')
      `, [
        tournamentId, 
        matchPair.match, 
        player1 ? player1.user_id : null, 
        player2 ? player2.user_id : null
      ]);
      
      // If it's a bye match, automatically advance the player
      if (player1 && !player2) {
        await this.advancePlayerToNextRound(db, tournamentId, 1, matchPair.match, player1.user_id);
      }
    }
    
    // Create placeholder matches for subsequent rounds
    for (let round = 2; round <= numRounds; round++) {
      const matchesInRound = Math.pow(2, numRounds - round);
      
      for (let match = 1; match <= matchesInRound; match++) {
        await db.run(`
          INSERT INTO tournament_matches 
          (tournament_id, round, match_number, status)
          VALUES (?, ?, ?, 'scheduled')
        `, [tournamentId, round, match, 'scheduled']);
      }
    }
  }

  static async getMatchById(db: Database, matchId: number): Promise<MatchData | undefined> {
    return db.get(`
      SELECT * FROM tournament_matches
      WHERE id = ?
    `, [matchId]);
  }

  static async updateMatchGameId(db: Database, matchId: number, gameId: string, status: string): Promise<void> {
    await db.run(`
      UPDATE tournament_matches
      SET game_id = ?, status = ?
      WHERE id = ?
    `, [gameId, status, matchId]);
  }

  static async completeMatch(db: Database, matchId: number, winnerId: number, player1Score: number, player2Score: number): Promise<void> {
    // Get match details
    const match = await this.getMatchById(db, matchId);
    if (!match) return;
    
    // Record result in match_history if not already there
    if (match.game_id) {
      // Check if entry exists
      const historyEntry = await db.get(`
        SELECT id FROM match_history
        WHERE id = ?
      `, [match.game_id]);
      
      if (!historyEntry) {
        // Create entry in match_history
        await db.run(`
          INSERT INTO match_history 
          (id, match_date, player1_id, player2_id, winner_id, tournament_id, left_score, right_score)
          VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
        `, [match.game_id, match.player1_id, match.player2_id, winnerId, match.tournament_id, player1Score, player2Score]);
      } else {
        // Update existing entry
        await db.run(`
          UPDATE match_history
          SET winner_id = ?, left_score = ?, right_score = ?
          WHERE id = ?
        `, [winnerId, player1Score, player2Score, match.game_id]);
      }
    }
    
    // Update match status
    await db.run(`
      UPDATE tournament_matches
      SET status = 'completed', winner_id = ?
      WHERE id = ?
    `, [winnerId, matchId]);
    
    // Update loser status
    const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
    if (loserId) {
      await db.run(`
        UPDATE tournament_participants
        SET status = 'eliminated'
        WHERE tournament_id = ? AND user_id = ?
      `, [match.tournament_id, loserId]);
    }
  }

  static async advancePlayerToNextRound(db: Database, tournamentId: number, currentRound: number, currentMatchNumber: number, winnerId: number): Promise<void> {
    // Calculate next round and match number
    const nextRound = currentRound + 1;
    const nextMatchNumber = Math.ceil(currentMatchNumber / 2);
    
    // Determine if this player should be placed in player1 or player2 slot
    const isPlayer1 = currentMatchNumber % 2 !== 0;
    
    // Update the next round match
    if (isPlayer1) {
      await db.run(`
        UPDATE tournament_matches
        SET player1_id = ?
        WHERE tournament_id = ? AND round = ? AND match_number = ?
      `, [winnerId, tournamentId, nextRound, nextMatchNumber]);
    } else {
      await db.run(`
        UPDATE tournament_matches
        SET player2_id = ?
        WHERE tournament_id = ? AND round = ? AND match_number = ?
      `, [winnerId, tournamentId, nextRound, nextMatchNumber]);
    }
    
    // Check if both players are assigned to the next match
    const nextMatch = await db.get(`
      SELECT player1_id, player2_id
      FROM tournament_matches
      WHERE tournament_id = ? AND round = ? AND match_number = ?
    `, [tournamentId, nextRound, nextMatchNumber]);
    
    // If it's a bye in the next round (only one player assigned), advance that player automatically
    if (nextMatch && nextMatch.player1_id && !nextMatch.player2_id) {
      await this.advancePlayerToNextRound(db, tournamentId, nextRound, nextMatchNumber, nextMatch.player1_id);
    } else if (nextMatch && !nextMatch.player1_id && nextMatch.player2_id) {
      await this.advancePlayerToNextRound(db, tournamentId, nextRound, nextMatchNumber, nextMatch.player2_id);
    }
  }

  static async updatePlayerEloRatings(db: Database, player1Id: number, player2Id: number, winnerId: number): Promise<void> {
    // Get current ELO ratings
    const player1Rating = await db.get(`
      SELECT elo_rating, matches_played FROM user_ratings WHERE user_id = ?
    `, [player1Id]) || { elo_rating: 1000, matches_played: 0 };
    
    const player2Rating = await db.get(`
      SELECT elo_rating, matches_played FROM user_ratings WHERE user_id = ?
    `, [player2Id]) || { elo_rating: 1000, matches_played: 0 };
    
    // Calculate new ELO ratings
    const k = 32; // K factor
    
    // Expected scores
    const expectedScoreP1 = 1 / (1 + Math.pow(10, (player2Rating.elo_rating - player1Rating.elo_rating) / 400));
    const expectedScoreP2 = 1 / (1 + Math.pow(10, (player1Rating.elo_rating - player2Rating.elo_rating) / 400));
    
    // Actual scores
    const actualScoreP1 = winnerId === player1Id ? 1 : 0;
    const actualScoreP2 = winnerId === player2Id ? 1 : 0;
    
    // New ratings
    const newRatingP1 = Math.round(player1Rating.elo_rating + k * (actualScoreP1 - expectedScoreP1));
    const newRatingP2 = Math.round(player2Rating.elo_rating + k * (actualScoreP2 - expectedScoreP2));
    
    // Update ratings in database
    await db.run(`
      INSERT INTO user_ratings (user_id, elo_rating, matches_played, last_updated)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        elo_rating = excluded.elo_rating,
        matches_played = matches_played + 1,
        last_updated = excluded.last_updated
    `, [player1Id, newRatingP1, player1Rating.matches_played + 1]);
    
    await db.run(`
      INSERT INTO user_ratings (user_id, elo_rating, matches_played, last_updated)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        elo_rating = excluded.elo_rating,
        matches_played = matches_played + 1,
        last_updated = excluded.last_updated
    `, [player2Id, newRatingP2, player2Rating.matches_played + 1]);
  }

  static async checkTournamentCompletion(db: Database, tournamentId: number): Promise<boolean> {
    // Count completed and total matches
    const counts = await db.get(`
      SELECT 
        COUNT(*) as total_matches,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_matches
      FROM tournament_matches
      WHERE tournament_id = ?
    `, [tournamentId]);
    
    return counts.total_matches > 0 && counts.total_matches === counts.completed_matches;
  }

  static async updateTournamentWinner(db: Database, tournamentId: number, winnerId: number): Promise<void> {
    // Update tournament winner
    await db.run(`
      UPDATE tournament_participants
      SET status = 'winner'
      WHERE tournament_id = ? AND user_id = ?
    `, [tournamentId, winnerId]);
  }

  static async getUserTournaments(db: Database, userId: number): Promise<TournamentData[]> {
    return db.all(`
      SELECT t.* 
      FROM tournaments t
      JOIN tournament_participants tp ON t.id = tp.tournament_id
      WHERE tp.user_id = ?
      ORDER BY t.start_date DESC
    `, [userId]);
  }

  static async getUserUpcomingMatches(db: Database, userId: number): Promise<MatchData[]> {
    return db.all(`
      SELECT 
        tm.id, tm.tournament_id, tm.round, tm.match_number,
        tm.player1_id, tm.player2_id, tm.status, tm.game_id, tm.scheduled_time,
        u1.username as player1_name, u2.username as player2_name,
        t.name as tournament_name
      FROM tournament_matches tm
      JOIN tournaments t ON tm.tournament_id = t.id
      LEFT JOIN users u1 ON tm.player1_id = u1.id
      LEFT JOIN users u2 ON tm.player2_id = u2.id
      WHERE (tm.player1_id = ? OR tm.player2_id = ?)
      AND tm.status IN ('scheduled', 'in_progress')
      ORDER BY tm.scheduled_time, tm.round, tm.match_number
    `, [userId, userId]);
  }
}
*/