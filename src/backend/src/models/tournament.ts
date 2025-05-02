import { Database } from 'sqlite';

class Tournament {
    static async findById(db: Database, id: number) {
        return db.get(`
            SELECT t.*, COUNT(tp.id) as current_participants 
            FROM tournaments t
            LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
            WHERE t.id = ?
            GROUP BY t.id
        `, [id]);
    }
    
    static async findActiveTournaments(db: Database) {
        return db.all(`
            SELECT t.*, COUNT(tp.id) as current_participants 
            FROM tournaments t
            LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
            WHERE t.status == 'pending'
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `);
    }

    static async findByStatus(db: Database, status: string) {
        return db.all('SELECT * FROM tournaments WHERE status = ?', status);
    }

    static async findAbandonedTournaments(db: Database) {
        return db.all(`
            SELECT t.id, 
                (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as participant_count
            FROM tournaments t
            WHERE t.status = 'pending'
            AND datetime(t.created_at, '+7 days') < datetime('now')
        `);
    }

    static async findStuckTournaments(db: Database) {
        return db.all(`
            SELECT id
            FROM tournaments
            WHERE status = 'active'
            AND datetime(created_at, '+3 days') < datetime('now')
        `);
    }

    static async updateStatus(db: Database, tournamentId: number, status: string) {
        await db.run(`
            UPDATE tournaments
            SET status = ?
            WHERE id = ?
        `, [status, tournamentId]);
        
        return this.findById(db, tournamentId);
    }

    static async getPendingMatches(db: Database, tournamentId: number) {
        return db.all(`
            SELECT * 
            FROM tournament_matches
            WHERE tournament_id = ?
            AND status IN ('scheduled', 'in_progress')
        `, [tournamentId]);
    }

    static async getPlayerEloRating(db: Database, userId: number) {
        const player = await db.get(`
            SELECT elo_rating FROM player_stats WHERE user_id = ?
        `, [userId]);
        
        return player?.elo_rating || 1200;
    }

    static async getTournamentMatches(db: Database, tournamentId: number) {
        return db.all(`
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
    }
    
    static async getTournamentParticipants(db: Database, tournamentId: number) {
        return db.all(`
            SELECT u.id, u.username, ps.elo_rating as elo, tp.status, tp.alias
            FROM tournament_participants tp
            JOIN users u ON tp.user_id = u.id
            LEFT JOIN player_stats ps ON u.id = ps.user_id
            WHERE tp.tournament_id = ?
            ORDER BY ps.elo_rating DESC
        `, [tournamentId]);
    }

    static async findTournamentsByUserId(db: Database, userId: number) {
        return db.all(`
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
    }

    static async setMatchWinner(db: Database, matchId: number, winnerId: number) {
        await db.run(`
            UPDATE tournament_matches
            SET winner_id = ?, status = 'completed'
            WHERE id = ?
        `, [winnerId, matchId]);
    }

    static async advancePlayerToNextMatch(db: Database, tournamentId: number, winnerId: number, isPlayer1: boolean) {
        const nextMatchNumber = 1;
        const playerField = isPlayer1 ? 'player1_id' : 'player2_id';
        
        await db.run(`
            UPDATE tournament_matches
            SET ${playerField} = ?
            WHERE tournament_id = ? AND round = 2 AND match_number = ?
        `, [winnerId, tournamentId, nextMatchNumber]);
    }

    static async getFinalMatchWinner(db: Database, tournamentId: number) {
        return db.get(`
            SELECT winner_id FROM tournament_matches
            WHERE tournament_id = ?
            AND round = 2 
            AND winner_id IS NOT NULL
        `, [tournamentId]);
    }

    static async setTournamentWinner(db: Database, tournamentId: number, winnerId: number) {
        await db.run(`
            UPDATE tournament_participants
            SET status = 'winner'
            WHERE tournament_id = ? AND user_id = ?
        `, [tournamentId, winnerId]);
        
        await db.run(`
            UPDATE tournament_participants
            SET status = 'eliminated'
            WHERE tournament_id = ? AND user_id != ? AND status != 'winner'
        `, [tournamentId, winnerId]);
    }

    static async create(db: Database, { name, description = null }: 
        { name: string; description?: string | null }) {
        
        const result = await db.run(
            'INSERT INTO tournaments (name, description, status, created_at) VALUES (?, ?, ?, datetime("now"))',
            name, description, 'pending'
        );
        
        return result;
    }

    static async addParticipant(db: Database, tournamentId: number, userId: number, alias: string) {
        await db.run(`
            INSERT INTO tournament_participants (tournament_id, user_id, alias)
            VALUES (?, ?, ?)
          `, [tournamentId, userId, alias.trim()]);
        
        const participantCount = await db.get(
            'SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?',
            tournamentId
        );
        
        return participantCount.count;
    }
    
    static async isPendingTournament(db: Database, tournamentId: number) {
        return db.get(`
            SELECT * FROM tournaments 
            WHERE id = ? AND status = 'pending'
        `, [tournamentId]);
    }
    
    static async isUserRegistered(db: Database, tournamentId: number, userId: number) {
        return db.get(`
            SELECT * FROM tournament_participants
            WHERE tournament_id = ? AND user_id = ?
        `, [tournamentId, userId]);
    }
    
    static async isAliasTaken(db: Database, tournamentId: number, alias: string) {
        return db.get(`
            SELECT * FROM tournament_participants
            WHERE tournament_id = ? AND alias = ?
        `, [tournamentId, alias.trim()]);
    }
    
    static async getParticipantCount(db: Database, tournamentId: number) {
        const result = await db.get(`
            SELECT COUNT(*) as count FROM tournament_participants
            WHERE tournament_id = ?
        `, [tournamentId]);
        return result.count;
    }
    
    static async getMatchForPlayer(db: Database, matchId: number, userId: number) {
        return db.get(`
            SELECT * FROM tournament_matches
            WHERE id = ? AND (player1_id = ? OR player2_id = ?)
            AND status IN ('scheduled', 'in_progress')
        `, [matchId, userId, userId]);
    }
    
    static async setMatchGameId(db: Database, matchId: number, gameId: string) {
        await db.run(`
            UPDATE tournament_matches
            SET game_id = ?, status = 'in_progress'
            WHERE id = ?
        `, [gameId, matchId]);
    }
    
    static async findMatchByGameId(db: Database, gameId: string) {
        return db.get(`
            SELECT * FROM tournament_matches
            WHERE game_id = ?
        `, [gameId]);
    }
    
    static async setParticipantStatus(db: Database, tournamentId: number, userId: number, status: string) {
        await db.run(`
            UPDATE tournament_participants
            SET status = ?
            WHERE tournament_id = ? AND user_id = ?
        `, [status, tournamentId, userId]);
    }
    
    static async getParticipantsWithMissingAliases(db: Database, tournamentId: number) {
        return db.all(`
            SELECT tp.id, u.username 
            FROM tournament_participants tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.tournament_id = ? AND (tp.alias IS NULL OR tp.alias = '')
        `, [tournamentId]);
    }
    
    static async setParticipantAlias(db: Database, participantId: number, alias: string) {
        await db.run(`
            UPDATE tournament_participants
            SET alias = ?
            WHERE id = ?
        `, [alias, participantId]);
    }
    
    static async getParticipantsForSeeding(db: Database, tournamentId: number) {
        return db.all(`
            SELECT tp.user_id, ps.elo_rating
            FROM tournament_participants tp
            LEFT JOIN player_stats ps ON tp.user_id = ps.user_id
            WHERE tp.tournament_id = ?
            ORDER BY ps.elo_rating DESC NULLS LAST
        `, [tournamentId]);
    }
    
    static async createMatch(db: Database, tournamentId: number, round: number, matchNumber: number, player1Id?: number, player2Id?: number) {
        let sql = `
            INSERT INTO tournament_matches 
            (tournament_id, round, match_number, status`;
            
        let params = [tournamentId, round, matchNumber, 'scheduled'];
        
        if (player1Id) {
            sql += ', player1_id';
            params.push(player1Id);
        }
        
        if (player2Id) {
            sql += ', player2_id';
            params.push(player2Id);
        }
        
        sql += ') VALUES (' + Array(params.length).fill('?').join(', ') + ')';
        
        return db.run(sql, params);
    }
    
    static async getFinalMatch(db: Database, tournamentId: number) {
        return db.get(`
            SELECT * FROM tournament_matches
            WHERE tournament_id = ? AND round = 2 AND match_number = 1
        `, [tournamentId]);
    }
    
    static async updateMatchPlayer(db: Database, tournamentId: number, round: number, matchNumber: number, isPlayer1: boolean, playerId: number) {
        const field = isPlayer1 ? 'player1_id' : 'player2_id';
        await db.run(`
            UPDATE tournament_matches
            SET ${field} = ?
            WHERE tournament_id = ? AND round = ? AND match_number = ?
        `, [playerId, tournamentId, round, matchNumber]);
    }
}

export default Tournament;