import { Database } from 'sqlite';

class Profile {
    // Find profile by user ID
    static async findByUserId(db: Database, userId: number) {
        return db.get('SELECT * FROM profiles WHERE user_id = ?', userId);
    }

    // Create profile
    static async create(db: Database, { user_id, display_name = null, avatar_path = null }: 
        { user_id: number; display_name?: string | null; avatar_path?: string | null }) {
        
        return db.run(
            'INSERT INTO profiles (user_id, display_name, avatar_path) VALUES (?, ?, ?)',
            user_id, display_name, avatar_path
        );
    }

    // Update profile
    static async update(db: Database, userId: number, { display_name, avatar_path }: 
        { display_name?: string; avatar_path?: string }) {
        
        const updates = [];
        const params = [];
        
        if (display_name !== undefined) {
            updates.push('display_name = ?');
            params.push(display_name);
        }
        
        if (avatar_path !== undefined) {
            updates.push('avatar_path = ?');
            params.push(avatar_path);
        }
        
        if (updates.length === 0) return null;
        
        params.push(userId);
        
        return db.run(
            `UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`, 
            params
        );
    }
}

export default Profile;