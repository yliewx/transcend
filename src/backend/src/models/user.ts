import { Database } from 'sqlite';
import bcrypt from 'bcrypt';

class User {
    /*------------------------------SEARCH USER-----------------------------*/

    // Find all users
    static async findAll(db: Database) {
        return db.all('SELECT * FROM users');
    }

    // Find user by ID
    static async findById(db: Database, id: number) {
        return db.get('SELECT * FROM users WHERE id = ?', id);
    }

    // Find user by username
    static async findByUsername(db: Database, username: string) {
        return db.get('SELECT * FROM users WHERE username = ?', username);
    }

    // Find user by email
    static async findByEmail(db: Database, email: string) {
        return db.get('SELECT * FROM users WHERE email = ?', email);
    }

    /*------------------------------CREATE USER-----------------------------*/

    // User registration
    static async create(db: Database, { username, email, password }: { username: string; email: string; password: string }) {
        const existingUser = await db.get('SELECT username FROM users WHERE username = ?', username);
        if (existingUser) {
            throw new Error('Username already exists');
        }

        const existingEmail = await this.findByEmail(db, email);
        if (existingEmail) {
            throw new Error('Email already exists');
        }
    
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        return db.run(
            'INSERT INTO users (username, password, email, created_at) VALUES (?, ?, ?, ?)',
            username, hashedPassword, email, new Date().toISOString()
        );
    }

    /*----------------------------2FA PREFERENCES---------------------------*/

    // Get preferred 2FA method
    static async getPreferred2FAMethod(db: Database, id: number) {
        const result = await db.get('SELECT preferred_2fa_method FROM users WHERE id = ?', [id]);
        if (!result.preferred_2fa_method)
            return null;
        return result.preferred_2fa_method;
    }

    // Update preferred 2FA method
    static async updatePreferred2FAMethod(db: Database, id: number, method: string, phoneNumber?: string) {
        // Ensure that user id is valid
        const user = await this.findById(db, id);
        if (!user) {
            throw new Error('No user with this ID');
        }
        
        // Ensure the method is valid
        const validMethods = ['sms', 'email', 'authenticator'];
        if (!validMethods.includes(method)) {
            throw new Error('Invalid 2FA method');
        }

        // If `sms` is chosen, a phone number must be provided
        if (method === 'sms' && !phoneNumber) {
            throw new Error('Phone number is required for SMS 2FA');
        }

        // Update the database
        return db.run(
            'UPDATE users SET preferred_2fa_method = ?, phone_number = ? WHERE id = ?',
            method,
            method === 'sms' ? phoneNumber : null, // Store phone number only if SMS is selected
            id
        );
    }

    /*------------------------------UPDATE USER TO BE REMOVED-----------------------------*/
    static async update(db: Database, id: number, { username, email }: { username?: string; email?: string }) 
    {
        // Build dynamic update query based on provided fields
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
        
        // Only update if there are fields to update
        if (updateFields.length === 0) {
            const user = await this.findById(db, id);
            return user;
        }
        
        // Create SQL query with only the fields that need updating
        const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        params.push(id);
        
        await db.run(query, params);
        
        // Fetch and return the updated user
        return await this.findById(db, id);
    }
    
    /*------------------------------UPDATE USER-----------------------------*/

    // Update username
    static async updateUsername(db: Database, id: number, username: string) {
        await db.run('UPDATE users SET name = ? WHERE id = ?', [username, id]);
        return { id, username };
    }

    // Update email
    static async updateEmail(db: Database, id: number, email: string) {
        await db.run('UPDATE users SET email = ? WHERE id = ?', [email, id]);
        return { id, email };
    }

    // Update password
    static async updatePassword(db: Database, id: number, password: string) {
        await db.run('UPDATE users SET password = ? WHERE id = ?', [password, id]);
        return { id };
    }

    // Set OTP secret
    static async setOtpSecret(db: Database, id: number, otpSecret: string, otpAuthUrl: string) {
        await db.run('UPDATE users SET otp_secret = ?, otp_auth_url = ? WHERE id = ?', [otpSecret, otpAuthUrl, id]);
        return { id, otpSecret, otpAuthUrl };
    }

    // Update OTP settings
    static async setOtpVerified(db: Database, id: number, otpVerified: boolean) {
        await db.run('UPDATE users SET otp_verified = ? WHERE id = ?', [otpVerified, id]);
        return { id, otpVerified };
    }

    /*------------------------------DELETE USER-----------------------------*/

    // Delete user
    static async delete(db: Database, id: number) {
        await db.run('DELETE FROM users WHERE id = ?', id);
    }
}

export default User;