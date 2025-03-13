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

    // User registration
    static async create(db: Database, { username, email, password }: { username: string; email: string; password: string }) {
        const existingUser = await db.get('SELECT username FROM users WHERE username = ?', username);
        if (existingUser) {
            throw new Error('Username already exists');
        }

        const existingEmail = await db.get('SELECT email FROM users WHERE email = ?', email);
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
    static async update(db: Database, id: number, { username, email, password }: { username: string; email: string; password: string }) {
        await db.run('UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?', [username, email, password, id]);
        return { id, username, email };
    }

    // Delete user
    static async delete(db: Database, id: number) {
        await db.run('DELETE FROM users WHERE id = ?', id);
    }
}

export default User;