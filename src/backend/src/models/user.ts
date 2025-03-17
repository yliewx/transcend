import { Database } from 'sqlite';
import bcrypt from 'bcrypt';

class User {
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

    // Update user info
    // static async update(db: Database, id: number, { username, email, password }: { username: string; email: string; password: string }) {
    //     await db.run('UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?', [username, email, password, id]);
    //     return { id, username, email };
    // }

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
    
    // Add a separate method for password updates
    static async updatePassword(db: Database, id: number, passwordHash: string) {
        await db.run('UPDATE users SET password = ? WHERE id = ?', 
            [passwordHash, id]);
        return true;
    }

    // Delete user
    static async delete(db: Database, id: number) {
        await db.run('DELETE FROM users WHERE id = ?', id);
    }
}

export default User;