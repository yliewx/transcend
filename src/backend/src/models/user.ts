import { Database } from 'sqlite'; // Ensure you import the Database type from sqlite
import { getDb } from '../db.js'; // import the database connection function
import bcrypt from 'bcrypt';

class User {
    // Init & cache database connection
    static db: Database | null = null;

    static async initialize(): Promise<void> {
        if (!User.db) {
        User.db = await getDb();
        }
    }

    /* METHODS */

    // Find all users
    static async findAll() {
        await User.initialize(); // Ensure the db connection is ready
        return User.db!.all('SELECT * FROM users'); // Use non-null assertion to tell TypeScript db is initialized
    }

    // Find user by ID
    static async findById(id: number) {
        await User.initialize();
        return User.db!.get('SELECT * FROM users WHERE id = ?', id); // Non-null assertion
    }

    // Find user by username
    static async findByUsername(username: string) {
        await User.initialize();
        return User.db!.get('SELECT * FROM users WHERE username = ?', username); // Non-null assertion
    }

    // User registration
    static async create({ username, email, password }: { username: string; email: string; password: string }) {
        await User.initialize();

        const existingUser = await User.db!.get('SELECT username FROM users WHERE username = ?', username);
        if (existingUser) {
        throw new Error('Username already exists');
        }

        const existingEmail = await User.db!.get('SELECT email FROM users WHERE email = ?', email);
        if (existingEmail) {
        throw new Error('Email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        return User.db!.run(
            'INSERT INTO users (username, password, email, created_at) VALUES (?, ?, ?, ?)',
            username, hashedPassword, email, new Date().toISOString()
        );
    }

    // Update user info
    static async update(id: number, { username, email, password }: { username: string; email: string; password: string }) {
        await User.initialize();
        await User.db!.run('UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?', [username, email, password, id]);
        return { id, username, email };
    }

    // Delete user
    static async delete(id: number) {
        await User.initialize();
        await User.db!.run('DELETE FROM users WHERE id = ?', id);
    }
}

export default User;
