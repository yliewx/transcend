import { Database } from 'sqlite';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

class User {
    /*------------------------------SEARCH USER-----------------------------*/
    
    static async findAll(db: Database) {
        return db.all('SELECT * FROM users');
    }

    static async findById(db: Database, id: string) {
        return db.get('SELECT * FROM users WHERE id = ?', id);
    }

    static async findByGoogleId(db: Database, googleId: string) {
        return db.get('SELECT * FROM users WHERE google_id = ?', googleId);
    }

    static async findByUsername(db: Database, username: string) {
        return db.get('SELECT * FROM users WHERE username = ?', username);
    }

    static async findByEmail(db: Database, email: string) {
        return db.get('SELECT * FROM users WHERE email = ?', email);
    }

    /*------------------------------CREATE USER-----------------------------*/

    // static async create(
    //     db: Database, 
    //     { username, email, password, google_id }: { username: string; email: string; password?: string; google_id?: string }
    // ) {
    //     const existingUser = await db.get('SELECT username FROM users WHERE username = ?', username);
    //     if (existingUser) {
    //         throw new Error('Username already exists');
    //     }
    
    //     const existingEmail = await this.findByEmail(db, email);
    //     if (existingEmail) {
    //         throw new Error('Email already exists');
    //     }
    
    //     let hashedPassword: string | null = null;
    //     if (password) {
    //         hashedPassword = await bcrypt.hash(password, 10);
    //     }
    
    //     return db.run(
    //         'INSERT INTO users (username, password, email, google_id, created_at) VALUES (?, ?, ?, ?, ?)',
    //         username, hashedPassword, email, google_id || null, new Date().toISOString()
    //     );
    // }

    static async create(
        db: Database, 
        { id, username, email, password, google_id }: { id?: string; username: string; email: string; password?: string; google_id?: string }
    ) {
        const existingUser = await db.get('SELECT username FROM users WHERE username = ?', username);
        if (existingUser) {
            throw new Error('Username already exists');
        }

        const existingEmail = await this.findByEmail(db, email);
        if (existingEmail) {
            throw new Error('Email already exists');
        }

        let hashedPassword: string | null = null;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const userId = id || uuidv4(); // Generate UUID if not provided

        await db.run(
            'INSERT INTO users (id, username, password, email, google_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            userId, username, hashedPassword, email, google_id || null, new Date().toISOString()
        );

        return userId; // Just return the UUID directly
    }

    /*----------------------------2FA PREFERENCES---------------------------*/

    static async getPreferred2FAMethod(db: Database, id: string) {
        const result = await db.get('SELECT otp_option FROM users WHERE id = ?', [id]);
        if (!result.otp_option)
            return null;
        return result.otp_option;
    }

    static async updateOtpOption(db: Database, id: string, otp_option: string, otp_contact?: string | null) {
        const user = await this.findById(db, id);
        if (!user) {
            throw new Error('No user with this ID');
        }
        
        const validMethods = ['sms', 'email', 'app'];
        if (!validMethods.includes(otp_option)) {
            throw new Error('Invalid 2FA method');
        }

        if ((otp_option === 'sms' || otp_option === 'email') && !otp_contact) {
            throw new Error('Contact information required for SMS and email 2FA');
        }

        return db.run(
            'UPDATE users SET otp_option = ?, otp_contact = ? WHERE id = ?',
            otp_option,
            otp_option === 'sms' || otp_option === 'email' ? otp_contact : null,
            id
        );
    }

    /*------------------------------UPDATE USER TO BE REMOVED-----------------------------*/
    static async update(db: Database, id: string, { username, email }: { username?: string; email?: string }) 
    {
        const updateFields = [];
        const params = [];
        
        if (username !== undefined) {
            updateFields.push('username = ?');
            params.push(username);
        }
        
        if (email !== undefined) {
            updateFields.push('email = ?');
            params.push(email);
        }
        
        if (updateFields.length === 0) {
            const user = await this.findById(db, id);
            return user;
        }
        
        const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        params.push(id);
        
        await db.run(query, params);
        
        return await this.findById(db, id);
    }
    
    /*------------------------------UPDATE USER-----------------------------*/

    static async updateGoogleId(db: Database, id: string, googleId: string) {
        await db.run('UPDATE users SET google_id = ? WHERE id = ?', [googleId, id]);
        return { id, googleId };
    }

    static async updateUsername(db: Database, id: string, username: string) {
        await db.run('UPDATE users SET name = ? WHERE id = ?', [username, id]);
        return { id, username };
    }

    static async updateEmail(db: Database, id: string, email: string) {
        await db.run('UPDATE users SET email = ? WHERE id = ?', [email, id]);
        return { id, email };
    }

    static async updatePassword(db: Database, id: string, password: string) {
        await db.run('UPDATE users SET password = ? WHERE id = ?', [password, id]);
        console.log("Password updated in DB for user ID:", id);
        return { id };
    }

    static async getOtpSecret(db: Database, id: string) {
        const row = await db.get('SELECT otp_secret, otp_auth_url FROM users WHERE id = ?', [id]);
        if (!row || !row.otp_secret) {
            return null;
        }
        return row.otp_secret;
    }

    static async getOtpAuthUrl(db: Database, id: string) {
        const row = await db.get('SELECT otp_secret, otp_auth_url FROM users WHERE id = ?', [id]);
        if (!row || !row.otp_auth_url) {
            return null;
        }
        return row.otp_auth_url;
    }

    static async setOtpSecret(db: Database, id: string, otpSecret: string, otpAuthUrl: string) {
        await db.run('UPDATE users SET otp_secret = ?, otp_auth_url = ? WHERE id = ?', [otpSecret, otpAuthUrl, id]);
        return { id, otpSecret, otpAuthUrl };
    }

    static async setOtpVerified(db: Database, id: string, otpVerified: boolean) {
        await db.run('UPDATE users SET otp_verified = ? WHERE id = ?', [otpVerified, id]);
        return { id, otpVerified };
    }

    /*------------------------------DELETE USER-----------------------------*/

    static async delete(db: Database, id: string) {
        await db.run('DELETE FROM users WHERE id = ?', id);
    }
}

export default User;