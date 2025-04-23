import { getDb } from '../db';
import { Database } from 'sqlite';

export class TournamentManager {
  // Run this periodically (e.g., every hour)
  public static async processTournaments(): Promise<void> {
    const db = await getDb();
    
    try {
      // Process abandoned tournaments
      await TournamentManager.checkAbandonedTournaments(db);
      
      // Process auto-completion for stuck tournaments
      await TournamentManager.completeStuckTournaments(db);
    } catch (error) {
      console.error('Error processing tournaments:', error);
    }
  }

  // Check for pending tournaments that haven't reached 4 players in a long time
  private static async checkAbandonedTournaments(db: Database): Promise<void> {
    // Find tournaments that have been in pending state for more than 7 days
    // and haven't reached 4 participants
    const abandonedTournaments = await db.all(`
      SELECT t.id, 
             (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as participant_count
      FROM tournaments t
      WHERE t.status = 'pending'
      AND datetime(t.created_at, '+7 days') < datetime('now')
    `);
    
    for (const tournament of abandonedTournaments) {
      if (tournament.participant_count < 4) {
        // Cancel the tournament due to lack of participants
        await db.run(`
          UPDATE tournaments
          SET status = 'cancelled'
          WHERE id = ?
        `, [tournament.id]);
        
        console.log(`Cancelled tournament ${tournament.id} due to insufficient participants after 7 days.`);
      }
    }
  }
  
  // Process tournaments that are stuck in active state
  private static async completeStuckTournaments(db: Database): Promise<void> {
    // Find active tournaments that have been active for more than 3 days
    const stuckTournaments = await db.all(`
      SELECT id
      FROM tournaments
      WHERE status = 'active'
      AND datetime(created_at, '+3 days') < datetime('now')
    `);
    
    for (const tournament of stuckTournaments) {
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
          
          // For a 4-player tournament, we only need to check if this is semifinal
          // and advance the winner to the final if so
          if (match.round === 1) {
            const nextMatchNumber = 1; // Always 1 for the final
            const isPlayer1 = match.match_number === 1; // First semifinal winner goes to player1 slot
            
            if (isPlayer1) {
              await db.run(`
                UPDATE tournament_matches
                SET player1_id = ?
                WHERE tournament_id = ? AND round = 2 AND match_number = ?
              `, [winnerId, tournament.id, nextMatchNumber]);
            } else {
              await db.run(`
                UPDATE tournament_matches
                SET player2_id = ?
                WHERE tournament_id = ? AND round = 2 AND match_number = ?
              `, [winnerId, tournament.id, nextMatchNumber]);
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
      
      // Find tournament winner
      const finalMatch = await db.get(`
        SELECT winner_id FROM tournament_matches
        WHERE tournament_id = ?
        AND round = 2 
        AND winner_id IS NOT NULL
      `, [tournament.id]);
      
      if (finalMatch && finalMatch.winner_id) {
        // Mark winner in participants table
        await db.run(`
          UPDATE tournament_participants
          SET status = 'winner'
          WHERE tournament_id = ? AND user_id = ?
        `, [tournament.id, finalMatch.winner_id]);
        
        // Mark all other participants as eliminated
        await db.run(`
          UPDATE tournament_participants
          SET status = 'eliminated'
          WHERE tournament_id = ? AND user_id != ? AND status != 'winner'
        `, [tournament.id, finalMatch.winner_id]);
        
        console.log(`Set user ${finalMatch.winner_id} as winner of tournament ${tournament.id}`);
      }
    }
  }
}