import { Database } from 'sqlite';
import { RefreshTokenPayload } from '../plugins/jwt';

class RefreshToken {
    /*------------------------------SEARCH USER-----------------------------*/

    // Find by user_id
    static async findByUser(db: Database, user_id: number) {
        return db.get('SELECT * FROM refresh_tokens WHERE user_id = ?', user_id);
    }

    /*-----------------------------MANAGE TOKEN-----------------------------*/

    // Update refresh token id which expires in 7 days
    static async refresh(db: Database, user_id: number) {
        const token_id = crypto.randomUUID();
        await db.run(
            'INSERT INTO refresh_tokens (user_id, token_id, expires_at) VALUES (?, ?, ?)',
            [user_id, token_id, Date.now() + 7 * 24 * 60 * 60 * 1000]
        );
    }

    // Check whether decoded token_id matches the user's token_id in database
    // decoded = await request.jwtVerify<RefreshTokenPayload>();
    static async verify(db: Database, user_id: number, decoded: RefreshTokenPayload) {
        const tokenExists = await db.get(
            'SELECT * FROM refresh_tokens WHERE token_id = ? AND user_id = ?',
            [decoded.token_id, decoded.user_id]
        );

        if (!tokenExists) {
            throw new Error('Invalid or expired refresh token');
        }
    }

    // Invalidate refresh token (for security purposes)
    static async deleteByUser(db: Database, user_id: number) {
        const tokenExists = await db.get(
            'DELETE * FROM refresh_tokens WHERE user_id = ?',
            user_id
        );

        if (!tokenExists) {
            throw new Error('No valid refresh token found');
        }
    }

    static async deleteByToken(db: Database, token_id: string) {
        const tokenExists = await db.get(
            'DELETE * FROM refresh_tokens WHERE token_id = ?',
            token_id
        );

        if (!tokenExists) {
            throw new Error('Invalid refresh token ID');
        }
    }
}

export default RefreshToken;