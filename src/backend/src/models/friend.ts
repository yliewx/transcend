import { Database } from 'sqlite';

class Friend {
  /*------------------------------ FRIEND RELATIONSHIPS -----------------------------*/
  static async getFriendsList(db: Database, userId: number) {
    return db.all(`
      SELECT 
        f.id,
        u.id as user_id,
        u.username,
        p.display_name,
        f.created_at
      FROM 
        friendships f
      JOIN 
        users u ON f.friend_id = u.id
      LEFT JOIN 
        profiles p ON u.id = p.user_id
      WHERE 
        f.user_id = ?
      ORDER BY 
        p.display_name IS NULL, p.display_name, u.username
    `, userId);
  }

  static async areFriends(db: Database, userId: number, friendId: number) {
    const friendship = await db.get(
      'SELECT id FROM friendships WHERE (user_id = ? AND friend_id = ?)',
      [userId, friendId]
    );
    return !!friendship;
  }

  static async removeFriend(db: Database, userId: number, friendId: number) {
    return db.run(
      'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, friendId, friendId, userId]
    );
  }

  static async createFriendship(db: Database, userId: number, friendId: number) {
    await db.run(
      'INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)',
      [userId, friendId]
    );
    await db.run(
      'INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)',
      [friendId, userId]
    );
    return true;
  }

  /*------------------------------ FRIEND REQUESTS -----------------------------*/

  static async getIncomingRequests(db: Database, userId: number) {
    return db.all(`
      SELECT 
        id,
        sender_id as user_id,
        sender_username as username,
        sender_display_name as display_name,
        created_at
      FROM 
        pending_incoming_requests_view
      WHERE 
        recipient_id = ?
      ORDER BY 
        created_at DESC
    `, userId);
  }

  static async getOutgoingRequests(db: Database, userId: number) {
    return db.all(`
      SELECT 
        id,
        recipient_id as user_id,
        recipient_username as username,
        recipient_display_name as display_name,
        created_at
      FROM 
        pending_outgoing_requests_view
      WHERE 
        sender_id = ?
      ORDER BY 
        created_at DESC
    `, userId);
  }

  static async getExistingRequest(db: Database, userId1: number, userId2: number) {
    return db.get(
      'SELECT id, sender_id, recipient_id, status FROM friend_requests WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)',
      [userId1, userId2, userId2, userId1]
    );
  }

  static async getRequestById(db: Database, requestId: number) {
    return db.get(
      'SELECT id, sender_id, recipient_id, status, created_at FROM friend_requests WHERE id = ?',
      [requestId]
    );
  }

  static async getIncomingRequestById(db: Database, requestId: number, userId: number) {
    return db.get(`
      SELECT 
        id,
        sender_id as user_id,
        sender_username as username,
        sender_display_name as display_name,
        created_at
      FROM 
        pending_incoming_requests_view
      WHERE 
        id = ? AND recipient_id = ?
    `, [requestId, userId]);
  }

  static async createRequest(db: Database, senderId: number, recipientId: number) {
    const result = await db.run(
      'INSERT INTO friend_requests (sender_id, recipient_id, status) VALUES (?, ?, ?)',
      [senderId, recipientId, 'pending']
    );
    
    if (result.lastID) {
      return db.get(`
        SELECT fr.id, u.username, p.display_name
        FROM friend_requests fr
        JOIN users u ON fr.recipient_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE fr.id = ?
      `, result.lastID);
    }
    
    return null;
  }

  static async deleteRequestById(db: Database, requestId: number) {
    return db.run(
      'DELETE FROM friend_requests WHERE id = ?',
      [requestId]
    );
  }


  /*------------------------------ USER SEARCH -----------------------------*/

  static async searchUsers(db: Database, query: string, currentUserId: number) {
    return db.all(`
      SELECT 
        u.id,
        u.username,
        p.display_name
      FROM 
        users u
      LEFT JOIN 
        profiles p ON u.id = p.user_id
      WHERE 
        u.id != ? AND 
        (u.username LIKE ? OR p.display_name LIKE ?)
      LIMIT 20
    `, [currentUserId, `%${query}%`, `%${query}%`]);
  }
}

export default Friend;
