import { Database } from 'sqlite';

interface EloHistoryRow {
  id: number;
  user_id: number;
  match_id: number;
  elo_rating: number;
  previous_rating: number;
  rating_change: number;
  match_date: string;
}


class GameStats {
    static async recordGameResult(
        db: Database,
        userId: number | null,
        opponentId: number | null,
        winnerId: number | null,
        leftScore: number,
        rightScore: number,
        tournamentId: number = 0
    ) {
      return db.run(
          `INSERT INTO match_history 
              (match_date, player1_id, player2_id, winner_id, tournament_id, left_score, right_score) 
          VALUES 
              (datetime('now'), ?, ?, ?, ?, ?, ?)`,
          userId, 
          opponentId,
          winnerId, 
          tournamentId, 
          leftScore, 
          rightScore
      );
    }

    static async updateMatches(db: Database, userId: number, result: 'win' | 'loss'): Promise<void> {
      await db.run(
        `INSERT INTO player_stats (
          user_id, 
          games_played, 
          games_won, 
          games_lost
        ) VALUES (?, 1, ?, ?) 
        ON CONFLICT(user_id) DO UPDATE SET 
          games_played = games_played + 1,
          games_won = games_won + ?,
          games_lost = games_lost + ?`,
        userId,
        result === 'win' ? 1 : 0,
        result === 'loss' ? 1 : 0,
        result === 'win' ? 1 : 0,
        result === 'loss' ? 1 : 0
      );
    }

    static async updateWinStreak(db: Database, userId: number, won: boolean): Promise<void> {
      const player = await db.get(
        `SELECT current_win_streak, max_win_streak FROM player_stats WHERE user_id = ?`,
        userId
      );
      
      let currentStreak = player?.current_win_streak || 0;
      let maxStreak = player?.max_win_streak || 0;
      
      if (won) {
        currentStreak += 1;        
        console.log(`Current streak: ${currentStreak}`);
        maxStreak = currentStreak > maxStreak ? currentStreak : maxStreak;
      } 
      else 
        currentStreak = 0;
      
      await db.run(
        `INSERT INTO player_stats (user_id) VALUES (?)
        ON CONFLICT(user_id) 
        DO UPDATE SET 
          current_win_streak = ?,
          max_win_streak = ?`,
        userId, currentStreak, maxStreak
      );
    
    }

    static calculateNewEloRating(
      playerRating: number,
      opponentRating: number,
      actualScore: number,
      kFactor: number
    ): number {
      const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));      
      const newRating = Math.round(playerRating + kFactor * (actualScore - expectedScore));
      return newRating;
    }
  

    static async getUserEloRating(db: Database, userId: number): Promise<number> {
      const rating = await db.get(
        `SELECT elo_rating FROM player_stats WHERE user_id = ?`,
        userId
      );      
      return rating ? rating.elo_rating : 1200;
    }
    
    static async getUserStats(db: Database, userId: number) {
      const userStats = await db.get(
        `SELECT * FROM player_complete_stats_view WHERE id = ?`,
        userId
      );
      
      if (userStats) {
        return userStats;
      }
      else {
        throw new Error(`User ${userId} stats not found`);
      }
    }

    static async getLeaderboard(db: Database) {
      return db.all(
        `SELECT 
           id,
           display_name, 
           elo_rating, 
           rank,
           current_win_streak
         FROM player_complete_stats_view 
         WHERE games_played > 0
         ORDER BY rank ASC
         LIMIT 10`,
      );
    }

    static async getUserMatchHistory(db: Database, userId: number) {
        const rows = await db.all(`
          SELECT 
            mh.id, 
            mh.match_date,
            'You' as user_name,
            CASE
              WHEN mh.player1_id = ? THEN COALESCE(u2.username, 'Guest Player')
              WHEN mh.player2_id = ? THEN COALESCE(u1.username, 'Guest Player')
              ELSE 'Unknown Opponent'
            END as opponent_name,
            CASE
              WHEN mh.player1_id = ? THEN mh.left_score
              WHEN mh.player2_id = ? THEN mh.right_score
              ELSE 0
            END as user_score,
            CASE
              WHEN mh.player1_id = ? THEN mh.right_score
              WHEN mh.player2_id = ? THEN mh.left_score
              ELSE 0
            END as opponent_score,
            (mh.winner_id = ?) as user_won
          FROM match_history mh
          LEFT JOIN users u1 ON mh.player1_id = u1.id
          LEFT JOIN users u2 ON mh.player2_id = u2.id
          WHERE mh.player1_id = ? OR mh.player2_id = ?
          ORDER BY mh.match_date DESC
        `, userId, userId, userId, userId, userId, userId, userId, userId, userId);
        
        return rows;
    }


    static async updatePlayerElo(db: Database, userId: number, opponentId: number, actualScore: number): Promise<void> {
      try {
        const result = await db.get(
          `SELECT elo_rating, games_played FROM player_stats WHERE user_id = ?`,
          userId
        );
        
        const playerRating = result ? result.elo_rating : 1200;
        const gamesPlayed = result ? result.games_played : 0;
        
        let kFactor = gamesPlayed < 10 ? 40 : gamesPlayed < 30 ? 32 : 24;
        const opponentRating = await this.getUserEloRating(db, opponentId);
        
        const newRating = this.calculateNewEloRating(playerRating, opponentRating, actualScore, kFactor);
        const ratingChange = newRating - playerRating;
        
        await db.run(
          `INSERT INTO player_stats (user_id, elo_rating) 
           VALUES (?, ?) 
           ON CONFLICT(user_id) DO UPDATE SET 
           elo_rating = ?`,
          userId,
          newRating,
          newRating
        );
        
        const match = await db.get(
          `SELECT id FROM match_history 
           WHERE (player1_id = ? OR player2_id = ?) 
           ORDER BY match_date DESC LIMIT 1`,
          userId, userId
        );
        
        if (match) {
          await db.run(
            `INSERT INTO elo_history 
             (user_id, match_id, elo_rating, previous_rating, rating_change, match_date) 
             VALUES (?, ?, ?, ?, ?, datetime('now'))`,
            userId,
            match.id,
            newRating,
            playerRating,
            ratingChange
          );
        }
        
      } catch (error) {
        console.error('Error updating ELO rating:', error);
        throw error;
      }
    }

    static async getUserEloHistory(db: Database, userId: number) {
      try {
        const rows = await db.all(`
          SELECT 
            eh.id,
            eh.elo_rating,
            eh.previous_rating,
            eh.rating_change,
            eh.match_date,
            ehv.opponent_name,
            ehv.result
          FROM 
            elo_history eh
          JOIN
            elo_history_view ehv ON eh.id = ehv.id
          WHERE 
            eh.user_id = ?
          ORDER BY 
            eh.match_date ASC
        `, userId);
        
        return rows.map((row: EloHistoryRow) => ({
          ...row,
          formatted_date: new Date(row.match_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })
        }));
      } catch (error) {
        console.error('Error fetching ELO history:', error);
        throw error;
      }
    }
}
 

export default GameStats;
  
  