import { Database } from 'sqlite';
import { AuthTokenPayload } from '../../@types/global';
import bcrypt from 'bcrypt';

class RefreshToken {
    /*------------------------------SEARCH USER-----------------------------*/

    static async findByUser(db: Database, user_id: number) {
        return db.get('SELECT * FROM refresh_tokens WHERE user_id = ?', user_id);
    }

    /*-----------------------------MANAGE TOKEN-----------------------------*/

    static async create(db: Database, user_id: number) {
        const token_id = crypto.randomUUID();
        const hashed_token_id = await bcrypt.hash(token_id, 10); 

        await db.run(
            'INSERT OR REPLACE INTO refresh_tokens (user_id, token_id, expires_at) VALUES (?, ?, ?)',
            [user_id, hashed_token_id, Date.now() + 7 * 24 * 60 * 60 * 1000]
        );

        return token_id;
    }

    static async verify(db: Database, user_id: number, decoded: AuthTokenPayload) {
        if (decoded.token_type !== 'refresh' || !decoded.token_id) {
            throw new Error('Invalid token type or missing token ID');
        }

        const storedToken = await db.get(
            'SELECT * FROM refresh_tokens WHERE user_id = ?', decoded.id
        );

        if (!storedToken) {
            throw new Error('Invalid or expired refresh token (1)');
        }
        
        if (Date.now() > storedToken.expires_at) {
            throw new Error('Invalid or expired refresh token (2)');
        }

        const match = await bcrypt.compare(decoded.token_id, storedToken.token_id);
        if (!match) {
            throw new Error('Invalid or expired refresh token (3)');
        }
    }

    static async deleteByUser(db: Database, user_id: number) {
        const storedToken = await db.get(
            'DELETE * FROM refresh_tokens WHERE user_id = ?', user_id
        );

        if (!storedToken) {
            throw new Error('No valid refresh token found');
        }
    }

    static async deleteByToken(db: Database, token_id: string) {
        const storedToken = await db.get(
            'DELETE * FROM refresh_tokens WHERE token_id = ?', token_id
        );

        if (!storedToken) {
            throw new Error('Invalid refresh token ID');
        }
    }
}

export default RefreshToken;