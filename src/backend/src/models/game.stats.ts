import { Database } from 'sqlite';

class GameStats {

    static async recordGameResult(
        db: Database,
        player1Id: number | null,
        player2Id: number | null,
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
            player1Id === null ? null : player1Id, 
            player2Id === null ? null : player2Id,
            winnerId === null ? null : winnerId, 
            tournamentId, 
            leftScore, 
            rightScore
        );
    }

    // static async getUserMatchHistory(db: Database, userId: number) {
    //     return db.all(
    //     `SELECT 
    //         mh.id, 
    //         mh.match_date, 
    //         mh.left_score,
    //         mh.right_score,
    //         u1.username as player1_name,
    //         u2.username as player2_name,
    //         CASE 
    //             WHEN mh.winner_id = mh.player1_id THEN u1.username
    //             WHEN mh.winner_id = mh.player2_id THEN u2.username
    //             ELSE NULL
    //         END as winner_name,
    //         CASE WHEN mh.player1_id = $userId THEN mh.left_score ELSE mh.right_score END as user_score,
    //         CASE WHEN mh.player1_id = $userId THEN mh.right_score ELSE mh.left_score END as opponent_score,
    //         (mh.winner_id = $userId) as user_won
    //     FROM match_history mh
    //     JOIN users u1 ON mh.player1_id = u1.id
    //     JOIN users u2 ON mh.player2_id = u2.id
    //     WHERE mh.player1_id = $userId OR mh.player2_id = $userId
    //     ORDER BY mh.match_date DESC`,
    //     { $userId: userId }
    //     );
    // }

    static async getUserMatchHistory(db: Database, userId: number) {
        return db.all(`
          SELECT 
            mh.id, 
            mh.match_date, 
            mh.left_score,
            mh.right_score,
            'You' as player1_name, /* Always the current user */
            COALESCE(u2.username, 'Guest Player') as player2_name, /* Right side player */
            CASE 
              WHEN mh.winner_id = ? THEN 'You'
              ELSE 'Opponent'
            END as winner_name,
            mh.left_score as user_score, /* Left score is always your score */
            mh.right_score as opponent_score, /* Right score is always opponent score */
            (mh.winner_id = ?) as user_won
          FROM match_history mh
          LEFT JOIN users u2 ON mh.player2_id = u2.id
          WHERE mh.player1_id = ? /* Only get matches where you're the left player */
          ORDER BY mh.match_date DESC
        `, userId, userId, userId);
      }


    // static async getUserStats(db: Database, userId: number) {
    //     const stats = await db.get(
    //     `SELECT 
    //         COUNT(*) as games_played,
    //         SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as games_won,
    //         SUM(CASE WHEN winner_id IS NOT NULL AND winner_id != ? THEN 1 ELSE 0 END) as games_lost
    //     FROM match_history
    //     WHERE player1_id = ? OR player2_id = ?`,
    //     userId, userId, userId, userId
    //     );
        
    //     return {
    //     gamesPlayed: stats.games_played,
    //     gamesWon: stats.games_won,
    //     gamesLost: stats.games_lost,
    //     winRate: stats.games_played > 0 ? (stats.games_won / stats.games_played * 100).toFixed(1) : 0
    //     };
    // }

    static async getUserStats(db: Database, userId: number) {
        const stats = await db.get(
          `SELECT 
            COUNT(*) as games_played,
            SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as games_won,
            SUM(CASE WHEN (player1_id = ? AND (winner_id IS NULL OR winner_id != ?)) 
                     OR (player2_id = ? AND (winner_id IS NULL OR winner_id != ?)) 
                 THEN 1 ELSE 0 END) as games_lost
          FROM match_history
          WHERE player1_id = ? OR player2_id = ?`,
          userId, userId, userId, userId, userId, userId, userId
        );
        
        return {
          gamesPlayed: stats.games_played,
          gamesWon: stats.games_won,
          gamesLost: stats.games_lost,
          winRate: stats.games_played > 0 ? (stats.games_won / stats.games_played * 100).toFixed(1) : 0
        };
      }


    static async getMatchById(db: Database, matchId: number) {
        return db.get(
        `SELECT 
            mh.*,
            u1.username as player1_name,
            u2.username as player2_name,
            w.username as winner_name
        FROM match_history mh
        JOIN users u1 ON mh.player1_id = u1.id
        JOIN users u2 ON mh.player2_id = u2.id
        LEFT JOIN users w ON mh.winner_id = w.id
        WHERE mh.id = ?`,
        matchId
        );
    }
}

export default GameStats;
  
  