import { Database } from 'sqlite';

class Profile {
    static async findByUserId(db: Database, userId: number) {
        return db.get('SELECT * FROM profiles WHERE user_id = ?', userId);
    }

    static async create(db: Database, { user_id, display_name = null, avatar_path = null }: 
        { user_id: number; display_name?: string | null; avatar_path?: string | null }) {
        
        return db.run(
            'INSERT INTO profiles (user_id, display_name, avatar_path) VALUES (?, ?, ?)',
            user_id, display_name, avatar_path
        );
    }

    static async updateDisplayName(db: Database, userId: number, displayName: string) {
        await db.run(
            'UPDATE profiles SET display_name = ? WHERE user_id = ?', 
            [displayName, userId]
        );        
        return await this.findByUserId(db, userId);
    }
}

export default Profile;