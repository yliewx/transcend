import { Database } from 'sqlite';

interface FinalMatch {
    id: number;
    tournament_id: number;
    round: number;
    match_number: number;
    player1_participant_id: number | null;
    player2_participant_id: number | null;
    winner_participant_id: number | null;
    game_id: string | null;
    status: string;
    created_at: string;
}

class Tournament {
   
    /*----------------------------FOR getTournaments-----------------------------*/

    static async findPendingTournaments(db: Database) {
        return db.all(`
            SELECT t.*, COUNT(tp.id) as current_participants 
            FROM tournaments t
            LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
            WHERE t.status == 'pending'
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `);
    }

    /*----------------------------FOR getUserTournaments-----------------------------*/

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

    /*----------------------------FOR getTournamentDetails-----------------------------*/

    static async findById(db: Database, id: number) {
        return db.get(`
            SELECT t.*, (
                SELECT COUNT(*) 
                FROM tournament_participants 
                WHERE tournament_id = t.id
            ) as current_participants
            FROM tournaments t
            WHERE t.id = ?
        `, [id]);
    }

    static async getTournamentMatches(db: Database, tournamentId: number) {
        return db.all(`
            SELECT tm.*, 
                p1.alias as player1_alias,
                p2.alias as player2_alias
            FROM tournament_matches tm
            LEFT JOIN tournament_participants p1 ON tm.player1_participant_id = p1.id
            LEFT JOIN tournament_participants p2 ON tm.player2_participant_id = p2.id
            WHERE tm.tournament_id = ?
            ORDER BY tm.round, tm.match_number
        `, [tournamentId]);
    }
    
    static async getTournamentParticipants(db: Database, tournamentId: number) {
        return db.all(`
            SELECT 
                CASE WHEN tp.is_guest = 1 THEN NULL ELSE tp.user_id END as user_id,
                CASE WHEN tp.is_guest = 1 THEN 1200 ELSE ps.elo_rating END as elo,
                tp.alias,
                tp.status, 
                tp.id as participant_id
            FROM tournament_participants tp
            LEFT JOIN player_stats ps ON tp.user_id = ps.user_id
            WHERE tp.tournament_id = ?
            ORDER BY elo DESC
        `, [tournamentId]);
    }

    /*----------------------------FOR createTournament-----------------------------*/

    static async create(db: Database, { name, description = null, mode }: 
        { name: string; description?: string | null, mode : 'local' | 'remote' }) {
        
        const result = await db.run(
            'INSERT INTO tournaments (name, description, mode, status, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
            name, description, mode, 'pending'
        );
        
        return result;
    }

    // static async findByStatus(db: Database, status: string) {
    //     return db.all('SELECT * FROM tournaments WHERE status = ?', status);
    // }

    /*----------------------------FOR registerForTournament-----------------------------*/
    
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
    
    static async addParticipant(db: Database, tournamentId: number, userId: number, ua: string, oa: string | null) {
        // await db.run('BEGIN TRANSACTION');
        
        try {
            const result = await db.run(`
                INSERT INTO tournament_participants (tournament_id, user_id, alias, is_guest, host_id)
                VALUES (?, ?, ?, ?, ?)
            `, [tournamentId, userId, ua, 0, null]);
            
            const hostId = result.lastID; 
            if (oa) { 
                await db.run(`
                    INSERT INTO tournament_participants (tournament_id, user_id, alias, is_guest, host_id)
                    VALUES (?, ?, ?, ?, ?)
                `, [tournamentId, null, oa, 1, hostId]);
            }

            // await db.run('COMMIT');

        } catch (error) {
            //await db.run('ROLLBACK');
            console.error("Error adding participants:", error);
            throw error;
        }
    }

    /*----------------------------FOR startTournamentInternal-----------------------------*/

    static async updateTournamentStatus(db: Database, tournamentId: number, status: string) {
        await db.run(`
            UPDATE tournaments
            SET status = ?
            WHERE id = ?
        `, [status, tournamentId]);
        
        //return this.findById(db, tournamentId);
    }

    static async updateAllParticipantStatus(db: Database, tournamentId: number, status: string) {
        await db.run(`
            UPDATE tournament_participants
            SET status = ?
            WHERE tournament_id = ?
          `, [status, tournamentId]);
    }

    // static async getParticipantsForSeeding(db: Database, tournamentId: number) {
    //     return db.all(`
    //         SELECT tp.id, tp.host_id, tp.is_guest, ps.elo_rating
    //         FROM tournament_participants tp
    //         LEFT JOIN player_stats ps ON tp.user_id = ps.user_id
    //         WHERE tp.tournament_id = ?
    //         ORDER BY ps.elo_rating DESC NULLS LAST
    //     `, [tournamentId]);
    // }

    static async getParticipantsForSeeding(db: Database, tournamentId: number) {
        return db.all(`
            SELECT
                tp.id,
                tp.user_id,
                tp.alias,
                tp.host_id,
                tp.is_guest,
                ps.elo_rating
            FROM tournament_participants tp
            LEFT JOIN player_stats ps ON tp.user_id = ps.user_id
            WHERE tp.tournament_id = ?
            ORDER BY ps.elo_rating DESC NULLS LAST
        `, [tournamentId]);
    }

    static async createMatch(db: Database, 
        tournamentId: number, 
         mode: 'local' | 'remote',
        round: number, 
        matchNumber: number, 
        player1Id: number | null, 
        player2Id: number | null
    ) {
        return db.run(`
            INSERT INTO tournament_matches 
            (tournament_id, mode, round, match_number, player1_participant_id, player2_participant_id, status)
            VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
        `, [tournamentId, mode, round, matchNumber, player1Id, player2Id]);
    }


    /*----------------------------FOR joinTournamentMatch-----------------------------*/

    // static async getMatchForPlayer(db: Database, matchId: number, userId: number) {
    //     return db.get(`
    //         SELECT * FROM tournament_matches
    //         WHERE id = ? AND (player1_id = ? OR player2_id = ?)
    //         AND status IN ('scheduled', 'in_progress')
    //     `, [matchId, userId, userId]);
    // }

    // static async getMatchForPlayer(db: Database, matchId: number, userId: number) {
    //     return db.get(`
    //         SELECT tm.* 
    //         FROM tournament_matches tm
    //         WHERE tm.id = ? 
    //         AND (
    //             tm.player1_participant_id IN (SELECT id FROM tournament_participants WHERE user_id = ?)
    //             OR 
    //             tm.player2_participant_id IN (SELECT id FROM tournament_participants WHERE user_id = ?)
    //         )
    //         AND tm.status IN ('scheduled', 'in_progress')
    //     `, [matchId, userId, userId]);
    // }

    static async getMatchForPlayer(db: Database, matchId: number, userId: number) {
        return db.get(`
            SELECT
                tm.*,
                t.mode AS tournament_mode
            FROM tournament_matches tm
            JOIN tournaments t ON tm.tournament_id = t.id
            WHERE tm.id = ?
            AND (
                tm.player1_participant_id IN (SELECT id FROM tournament_participants WHERE user_id = ?)
                OR
                tm.player2_participant_id IN (SELECT id FROM tournament_participants WHERE user_id = ?)
                OR
                (
                    t.mode = 'local' AND (
                        tm.player1_participant_id IN (SELECT tp_guest.id FROM tournament_participants tp_guest JOIN tournament_participants tp_host ON tp_guest.host_id = tp_host.id WHERE tp_host.user_id = ? AND tp_guest.is_guest = 1)
                        OR
                        tm.player2_participant_id IN (SELECT tp_guest.id FROM tournament_participants tp_guest JOIN tournament_participants tp_host ON tp_guest.host_id = tp_host.id WHERE tp_host.user_id = ? AND tp_guest.is_guest = 1)
                    )
                )
            )
            AND tm.status IN ('scheduled', 'in_progress')
        `, [matchId, userId, userId, userId, userId]);
    }


    static async setMatchGameId(db: Database, matchId: number, gameId: string) {
        await db.run(`
            UPDATE tournament_matches
            SET game_id = ?, status = 'in_progress'
            WHERE id = ?
        `, [gameId, matchId]);
    }


    // static async setMatchWinner(db: Database, matchId: number, winnerId: number) {
    //     await db.run(`
    //         UPDATE tournament_matches
    //         SET winner_id = ?, status = 'completed'
    //         WHERE id = ?
    //     `, [winnerId, matchId]);
    // }

    static async setMatchWinner(db: Database, matchId: number, winnerParticipantId: number) {
        await db.run(`
            UPDATE tournament_matches
            SET winner_participant_id = ?, status = 'completed'
            WHERE id = ?
        `, [winnerParticipantId, matchId]);
    }
   
    
    // static async findMatchByGameId(db: Database, gameId: string) {
    //     return db.get(`
    //         SELECT * FROM tournament_matches
    //         WHERE game_id = ?
    //     `, [gameId]);
    // }

    static async findMatchByGameId(db: Database, gameId: string) {
        return db.get(`
            SELECT tm.*, t.mode AS tournament_mode 
            FROM tournament_matches tm
            JOIN tournaments t ON tm.tournament_id = t.id
            WHERE tm.game_id = ?
        `, [gameId]);
    }
    
    // static async setParticipantStatus(db: Database, tournamentId: number, userId: number, status: string) {
    //     await db.run(`
    //         UPDATE tournament_participants
    //         SET status = ?
    //         WHERE tournament_id = ? AND user_id = ?
    //     `, [status, tournamentId, userId]);
    // }
    static async setParticipantStatus(db: Database, tournamentId: number, participantId: number, status: string) {
        await db.run(`
            UPDATE tournament_participants
            SET status = ?
            WHERE tournament_id = ? AND id = ? 
        `, [status, tournamentId, participantId]);
    }
    
    // static async getFinalMatch(db: Database, tournamentId: number) {
    //     return db.get(`
    //         SELECT * FROM tournament_matches
    //         WHERE tournament_id = ? AND round = 2 AND match_number = 1
    //     `, [tournamentId]);
    // }
    // Updated: To return player1_participant_id and player2_participant_id
    static async getFinalMatch(db: Database, tournamentId: number): Promise<FinalMatch | undefined> {
        return db.get<FinalMatch>(`
            SELECT * FROM tournament_matches
            WHERE tournament_id = ? AND round = 2 AND match_number = 1
        `, [tournamentId]);
    }
    
    // static async updateMatchPlayer(db: Database, tournamentId: number, round: number, matchNumber: number, isPlayer1: boolean, playerId: number) {
    //     const field = isPlayer1 ? 'player1_id' : 'player2_id';
    //     await db.run(`
    //         UPDATE tournament_matches
    //         SET ${field} = ?
    //         WHERE tournament_id = ? AND round = ? AND match_number = ?
    //     `, [playerId, tournamentId, round, matchNumber]);
    // }

    // Updated: To use player1_participant_id and player2_participant_id
    static async updateMatchPlayer(db: Database, tournamentId: number, round: number, matchNumber: number, isPlayer1: boolean, participantId: number) {
        const field = isPlayer1 ? 'player1_participant_id' : 'player2_participant_id';
        await db.run(`
            UPDATE tournament_matches
            SET ${field} = ?
            WHERE tournament_id = ? AND round = ? AND match_number = ?
        `, [participantId, tournamentId, round, matchNumber]);
    }

    static async getParticipantById(db: Database, participantId: number) {
        return db.get(`
            SELECT id, user_id, alias, is_guest, host_id
            FROM tournament_participants
            WHERE id = ?
        `, [participantId]);
    }

    static async getUserIdByParticipantId(db: Database, participantId: number): Promise<number | null> {
        const participant = await db.get(`SELECT user_id FROM tournament_participants WHERE id = ?`, participantId);
        return participant ? participant.user_id : null;
    }

    // static async fetchParticipantIdsByGameId(db: Database, gameId: string): Promise<MatchParticipants | null> {
    //    const result = await db.get<MatchParticipants>(`
    //         SELECT player1_participant_id, player2_participant_id
    //         FROM tournament_matches
    //         WHERE game_id = ?
    //     `, [gameId]);

    //     // Explicitly return null if result is undefined
    //     return result || null;
    // }

    // static async getParticipantIdByUserIdAndTournamentId(db: Database, tournamentId: number, userId: number): Promise<number | null> {
    //     const result = await db.get<{ id: number }>(`
    //         SELECT id FROM tournament_participants
    //         WHERE tournament_id = ? AND user_id = ?
    //     `, [tournamentId, userId]);
    //     return result ? result.id : null;
    // }

    static async getParticipantIdByUserIdAndTournamentId(db: Database, tournamentId: number, userId: number | null): Promise<number | null> {
    let sql: string;
    let params: (number | null)[];

    if (userId === null) {
        sql = `
            SELECT id FROM tournament_participants
            WHERE tournament_id = ? AND user_id IS NULL
            -- AND is_guest = 1 -- Potentially add this if you strictly link null user_id to guests
        `;
        params = [tournamentId];
    } else {
        sql = `
            SELECT id FROM tournament_participants
            WHERE tournament_id = ? AND user_id = ?
        `;
        params = [tournamentId, userId];
    }

    const result = await db.get<{ id: number }>(sql, params);
    return result ? result.id : null;
}

}

export default Tournament;