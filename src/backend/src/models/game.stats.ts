import { Database } from 'sqlite';

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

    
    // static async getUserStats(db: Database, userId: number) {
    //     const stats = await db.get(
    //       `SELECT 
    //         COUNT(*) as games_played,
    //         SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as games_won,
    //         SUM(CASE WHEN (player1_id = ? AND (winner_id IS NULL OR winner_id != ?)) 
    //                  OR (player2_id = ? AND (winner_id IS NULL OR winner_id != ?)) 
    //              THEN 1 ELSE 0 END) as games_lost
    //       FROM match_history
    //       WHERE player1_id = ? OR player2_id = ?`,
    //       userId, userId, userId, userId, userId, userId, userId
    //     );
        
    //     return {
    //       gamesPlayed: stats.games_played,
    //       gamesWon: stats.games_won,
    //       gamesLost: stats.games_lost,
    //       winRate: stats.games_played > 0 ? (stats.games_won / stats.games_played * 100).toFixed(1) : 0
    //     };
    //   }


    // static async getMatchById(db: Database, matchId: number) {
    //     return db.get(
    //     `SELECT 
    //         mh.*,
    //         u1.username as player1_name,
    //         u2.username as player2_name,
    //         w.username as winner_name
    //     FROM match_history mh
    //     JOIN users u1 ON mh.player1_id = u1.id
    //     JOIN users u2 ON mh.player2_id = u2.id
    //     LEFT JOIN users w ON mh.winner_id = w.id
    //     WHERE mh.id = ?`,
    //     matchId
    //     );
    // }

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
      
      // Update database
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

  
    // static async updatePlayerElo(db: Database, userId: number, opponentId: number, actualScore: number): Promise<void> {
    //   const result = await db.get(
    //     `SELECT elo_rating, games_played FROM player_stats WHERE user_id = ?`,
    //     userId
    //   );
    //   const playerRating = result ? result.elo_rating : 1200; 
    //   const gamesPlayed = result ? result.games_played : 0;      
    //   let kFactor = gamesPlayed < 10 ? 40 : gamesPlayed < 30 ? 32 : 24;
    //   const opponentRating = await this.getUserEloRating(db, opponentId);

    //   const newRating = this.calculateNewEloRating(playerRating, opponentRating, actualScore, kFactor);
      
    //   const win = actualScore === 1;
      
    //   await db.run(
    //     `INSERT INTO player_stats 
    //       (user_id, elo_rating, games_played, games_won, games_lost, last_updated)
    //     VALUES 
    //       (?, ?, 1, ?, ?, datetime('now'))
    //     ON CONFLICT(user_id) 
    //     DO UPDATE SET 
    //       elo_rating = ?,
    //       games_played = games_played + 1,
    //       games_won = games_won + ?,
    //       games_lost = games_lost + ?,
    //       last_updated = datetime('now')`,
    //     userId, 
    //     newRating, 
    //     win ? 1 : 0,     
    //     win ? 0 : 1,
    //     newRating,
    //     win ? 1 : 0,
    //     win ? 0 : 1
    //   );
    // }

    static async updatePlayerElo(db: Database, userId: number, opponentId: number, actualScore: number): Promise<void> {
      const result = await db.get(
        `SELECT elo_rating, games_played FROM player_stats WHERE user_id = ?`,
        userId
      );
      
      const playerRating = result ? result.elo_rating : 1200;
      const gamesPlayed = result ? result.games_played : 0;
      
      let kFactor = gamesPlayed < 10 ? 40 : gamesPlayed < 30 ? 32 : 24;
      const opponentRating = await this.getUserEloRating(db, opponentId);
      
      const newRating = this.calculateNewEloRating(playerRating, opponentRating, actualScore, kFactor);
      
      // Insert if not exists, update if exists
      await db.run(
        `INSERT INTO player_stats (user_id, elo_rating) 
         VALUES (?, ?) 
         ON CONFLICT(user_id) DO UPDATE SET 
         elo_rating = ?`,
        userId,
        newRating,
        newRating
      );
    }
    
    static async getUserStats(db: Database, userId: number) {
      const userStats = await db.get(
        `SELECT * FROM player_complete_stats_view WHERE id = ?`,
        userId
      );
      
      if (userStats) {
        return userStats;
      }
      
      const userData = await db.get(
        `SELECT u.id, u.username, p.display_name
        FROM 
          users u
        LEFT JOIN
          profiles p ON u.id = p.user_id
        WHERE 
          u.id = ?`,
        userId
      );
      
      if (!userData) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      return {
        ...userData,
        elo_rating: 1200,
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        current_win_streak: 0,
        max_win_streak: 0,
        win_percentage: 0,
        rank: null,
        last_updated: new Date().toISOString()
      };
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
}
 

export default GameStats;
  
  