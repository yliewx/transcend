// tournament.manager.ts
import { getDb } from '../db';
import { Database } from 'sqlite';

export class TournamentManager {
  // Run this periodically (e.g., every hour)
  public static async processTournaments(): Promise<void> {
    const db = await getDb();
    
    try {
      // Start tournaments that should begin today
      await TournamentManager.startPendingTournaments(db);
      // Close tournaments that have ended
      await TournamentManager.completeTournaments(db);
      
    } catch (error) {
      console.error('Error processing tournaments:', error);
    }
  }

  private static async startPendingTournaments(db: Database): Promise<void> {
    // Find tournaments that should start now (either by date or max participants)
    const tournamentsToStart = await db.all(`
      SELECT t.id, t.max_participants,
             (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as participant_count
      FROM tournaments t
      WHERE t.status = 'pending'
      AND (
        datetime('now') >= datetime(t.start_date)
        OR
        (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) >= t.max_participants
      )
    `);
    
    for (const tournament of tournamentsToStart) {
      // Get participants
      const participants = await db.all(`
        SELECT tp.user_id, ps.elo_rating
        FROM tournament_participants tp
        LEFT JOIN player_stats ps ON tp.user_id = ps.user_id
        WHERE tp.tournament_id = ?
        ORDER BY ps.elo_rating DESC NULLS LAST
      `, [tournament.id]);
      

      // Start the tournament (update status)
      await db.run(`
        UPDATE tournaments
        SET status = 'active'
        WHERE id = ?
      `, [tournament.id]);
      
      // Generate tournament bracket
      // This is a simplified implementation for a single-elimination tournament
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
        `, [tournament.id, i + 1, player1.user_id, player2.user_id]);
      }
      
      // Handle bye if odd number of participants
      if (numberOfParticipants % 2 !== 0) {
        const middleIndex = Math.floor(numberOfParticipants / 2);
        await db.run(`
          INSERT INTO tournament_matches 
          (tournament_id, round, match_number, player1_id, player2_id, status, winner_id)
          VALUES (?, 1, ?, ?, NULL, 'completed', ?)
        `, [tournament.id, Math.floor(numberOfParticipants / 2) + 1, participants[middleIndex].user_id, participants[middleIndex].user_id]);
      }
      
      // Create empty matches for future rounds
      for (let round = 2; round <= rounds; round++) {
        const matchesInRound = Math.pow(2, rounds - round);
        
        for (let match = 1; match <= matchesInRound; match++) {
          await db.run(`
            INSERT INTO tournament_matches 
            (tournament_id, round, match_number, status)
            VALUES (?, ?, ?, 'scheduled')
          `, [tournament.id, round, match]);
        }
      }

      console.log(`Started tournament ${tournament.id} with ${numberOfParticipants} participants.`);
    }
  }

  
  private static async completeTournaments(db: Database): Promise<void> {
    // Find active tournaments that have passed their end date
    const tournamentsToComplete = await db.all(`
      SELECT id
      FROM tournaments
      WHERE status = 'active'
      AND datetime('now') > datetime(end_date)
    `);
    
    for (const tournament of tournamentsToComplete) {
      // Find any pending matches
      const pendingMatches = await db.get(`
        SELECT COUNT(*) as count
        FROM tournament_matches
        WHERE tournament_id = ?
        AND status IN ('scheduled', 'in_progress')
      `, [tournament.id]);
      
      if (pendingMatches.count === 0) {
        // All matches are complete, finalize the tournament
        await db.run(`
          UPDATE tournaments
          SET status = 'completed'
          WHERE id = ?
        `, [tournament.id]);
        
        console.log(`Completed tournament ${tournament.id} with all matches finished.`);
      } else {
        // Auto-resolve any pending matches by choosing the higher seeded player
        const matches = await db.all(`
          SELECT * 
          FROM tournament_matches
          WHERE tournament_id = ?
          AND status IN ('scheduled', 'in_progress')
        `, [tournament.id]);
        
        for (const match of matches) {
          if (match.player1_id && match.player2_id) {
            // Get players' ELO
            const player1 = await db.get(`
              SELECT elo_rating FROM player_stats WHERE user_id = ?
            `, [match.player1_id]);
            
            const player2 = await db.get(`
              SELECT elo_rating FROM player_stats WHERE user_id = ?
            `, [match.player2_id]);
            
            // Pick winner based on higher ELO
            const winnerId = (player1?.elo_rating || 1200) >= (player2?.elo_rating || 1200)
              ? match.player1_id
              : match.player2_id;
            
            // Update match
            await db.run(`
              UPDATE tournament_matches
              SET winner_id = ?, status = 'completed'
              WHERE id = ?
            `, [winnerId, match.id]);
            
            // Advance winner to next round if not the final
            const maxRound = await db.get(`
              SELECT MAX(round) as max_round FROM tournament_matches
              WHERE tournament_id = ?
            `, [tournament.id]);
            
            if (match.round < maxRound.max_round) {
              const nextRound = match.round + 1;
              const nextMatchNumber = Math.ceil(match.match_number / 2);
              const isPlayer1 = match.match_number % 2 !== 0;
              
              if (isPlayer1) {
                await db.run(`
                  UPDATE tournament_matches
                  SET player1_id = ?
                  WHERE tournament_id = ? AND round = ? AND match_number = ?
                `, [winnerId, tournament.id, nextRound, nextMatchNumber]);
              } else {
                await db.run(`
                  UPDATE tournament_matches
                  SET player2_id = ?
                  WHERE tournament_id = ? AND round = ? AND match_number = ?
                `, [winnerId, tournament.id, nextRound, nextMatchNumber]);
              }
            }
        } else if (match.player1_id && !match.player2_id) {
            // Player 1 wins by default if there's no opponent
            await db.run(`
              UPDATE tournament_matches
              SET winner_id = ?, status = 'completed'
              WHERE id = ?
            `, [match.player1_id, match.id]);
            
            // Advance winner
            const maxRound = await db.get(`
              SELECT MAX(round) as max_round FROM tournament_matches
              WHERE tournament_id = ?
            `, [tournament.id]);
            
            if (match.round < maxRound.max_round) {
              const nextRound = match.round + 1;
              const nextMatchNumber = Math.ceil(match.match_number / 2);
              const isPlayer1 = match.match_number % 2 !== 0;
              
              if (isPlayer1) {
                await db.run(`
                  UPDATE tournament_matches
                  SET player1_id = ?
                  WHERE tournament_id = ? AND round = ? AND match_number = ?
                `, [match.player1_id, tournament.id, nextRound, nextMatchNumber]);
              } else {
                await db.run(`
                  UPDATE tournament_matches
                  SET player2_id = ?
                  WHERE tournament_id = ? AND round = ? AND match_number = ?
                `, [match.player1_id, tournament.id, nextRound, nextMatchNumber]);
              }
            }
          }
        }
        
        // Mark tournament as completed
        await db.run(`
          UPDATE tournaments
          SET status = 'completed'
          WHERE id = ?
        `, [tournament.id]);
        
        console.log(`Completed tournament ${tournament.id} with auto-resolved matches.`);
      }
      
      // Find tournament winner
      const finalMatch = await db.get(`
        SELECT winner_id FROM tournament_matches
        WHERE tournament_id = ?
        AND round = (SELECT MAX(round) FROM tournament_matches WHERE tournament_id = ?)
        AND winner_id IS NOT NULL
      `, [tournament.id, tournament.id]);
      
      if (finalMatch && finalMatch.winner_id) {
        // Mark winner in participants table
        await db.run(`
          UPDATE tournament_participants
          SET status = 'winner'
          WHERE tournament_id = ? AND user_id = ?
        `, [tournament.id, finalMatch.winner_id]);
        
        console.log(`Set user ${finalMatch.winner_id} as winner of tournament ${tournament.id}`);
      }
    }
  }
}