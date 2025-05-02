import { getDb } from '../db';
import { Database } from 'sqlite';

export class TournamentManager {
  public static async processTournaments(): Promise<void> {
    const db = await getDb();
    
    try {
      await TournamentManager.checkAbandonedTournaments(db);      
      await TournamentManager.completeStuckTournaments(db);
    } catch (error) {
      console.error('Error processing tournaments:', error);
    }
  }

  private static async checkAbandonedTournaments(db: Database): Promise<void> {
    const abandonedTournaments = await db.all(`
      SELECT t.id, 
             (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as participant_count
      FROM tournaments t
      WHERE t.status = 'pending'
      AND datetime(t.created_at, '+7 days') < datetime('now')
    `);
    
    for (const tournament of abandonedTournaments) {
      if (tournament.participant_count < 4) {
        await db.run(`
          UPDATE tournaments
          SET status = 'cancelled'
          WHERE id = ?
        `, [tournament.id]);
        
        console.log(`Cancelled tournament ${tournament.id} due to insufficient participants after 7 days.`);
      }
    }
  }
  
  private static async completeStuckTournaments(db: Database): Promise<void> {
    const stuckTournaments = await db.all(`
      SELECT id
      FROM tournaments
      WHERE status = 'active'
      AND datetime(created_at, '+3 days') < datetime('now')
    `);
    
    for (const tournament of stuckTournaments) {
      const matches = await db.all(`
        SELECT * 
        FROM tournament_matches
        WHERE tournament_id = ?
        AND status IN ('scheduled', 'in_progress')
      `, [tournament.id]);
      
      for (const match of matches) {
        if (match.player1_id && match.player2_id) {
          const player1 = await db.get(`
            SELECT elo_rating FROM player_stats WHERE user_id = ?
          `, [match.player1_id]);
          
          const player2 = await db.get(`
            SELECT elo_rating FROM player_stats WHERE user_id = ?
          `, [match.player2_id]);
          
          const winnerId = (player1?.elo_rating || 1200) >= (player2?.elo_rating || 1200)
            ? match.player1_id
            : match.player2_id;
          
          await db.run(`
            UPDATE tournament_matches
            SET winner_id = ?, status = 'completed'
            WHERE id = ?
          `, [winnerId, match.id]);
          

          if (match.round === 1) {
            const nextMatchNumber = 1;
            const isPlayer1 = match.match_number === 1;
            
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
      
      await db.run(`
        UPDATE tournaments
        SET status = 'completed'
        WHERE id = ?
      `, [tournament.id]);
      
      console.log(`Completed tournament ${tournament.id} with auto-resolved matches.`);
      
      const finalMatch = await db.get(`
        SELECT winner_id FROM tournament_matches
        WHERE tournament_id = ?
        AND round = 2 
        AND winner_id IS NOT NULL
      `, [tournament.id]);
      
      if (finalMatch && finalMatch.winner_id) {
        await db.run(`
          UPDATE tournament_participants
          SET status = 'winner'
          WHERE tournament_id = ? AND user_id = ?
        `, [tournament.id, finalMatch.winner_id]);
        
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