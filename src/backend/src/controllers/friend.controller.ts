import { FastifyReply } from 'fastify';
import { getDb } from '../db.js';
import { AuthenticatedRequest } from '../../@types/fastify';
import User from '../models/user';
import Friend from '../models/friend';

// Get a user's friends list
export async function getFriends(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const db = await getDb();
    const userId = request.user.id;

    // Get friends list
    const friends = await Friend.getFriendsList(db, userId);

    return reply.send({
      success: true,
      friends: friends.map(friend => ({
        id: friend.user_id,
        username: friend.username,
        displayName: friend.display_name || friend.username
      }))
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve friends list'
    });
  }
}

// Get pending friend requests (both sent and received)
export async function getPendingRequests(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const db = await getDb();
    const userId = request.user.id;

    // Get incoming requests
    const incomingRequests = await Friend.getIncomingRequests(db, userId);
    
    // Get outgoing requests
    const outgoingRequests = await Friend.getOutgoingRequests(db, userId);

    // Combine requests with type indicator
    const allRequests = [
      ...incomingRequests.map(req => ({
        id: req.id,
        userId: req.user_id,
        username: req.username,
        displayName: req.display_name || req.username,
        requestType: 'incoming' as const,
        requestDate: req.created_at
      })),
      ...outgoingRequests.map(req => ({
        id: req.id,
        userId: req.user_id,
        username: req.username,
        displayName: req.display_name || req.username,
        requestType: 'outgoing' as const,
        requestDate: req.created_at
      }))
    ];

    return reply.send({
      success: true,
      requests: allRequests
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve pending requests'
    });
  }
}

// Search for users by username
export async function searchUsers(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const db = await getDb();
    const userId = request.user.id;
    const query = request.query.q as string;

    if (!query || query.trim().length < 3) {
      return reply.status(400).send({
        success: false,
        error: 'Search query must be at least 3 characters'
      });
    }

    // Search for users with matching username
    const users = await Friend.searchUsers(db, query, userId);

    return reply.send({
      success: true,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.display_name || user.username
      }))
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'Search failed'
    });
  }
}

// Send a friend request
export async function sendFriendRequest(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const db = await getDb();
    const senderId = request.user.id;
    const { userId: recipientId } = request.body as { userId: number };

    if (!recipientId) {
      return reply.status(400).send({
        success: false,
        error: 'Recipient ID is required'
      });
    }

    if (senderId === recipientId) {
      return reply.status(400).send({
        success: false,
        error: 'You cannot send a friend request to yourself'
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(db, recipientId);
    if (!recipient) {
      return reply.status(404).send({
        success: false,
        error: 'User not found'
      });
    }

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Check if they are already friends
      const areFriends = await Friend.areFriends(db, senderId, recipientId);
      
      if (areFriends) {
        await db.run('ROLLBACK');
        return reply.status(400).send({
          success: false,
          error: 'You are already friends with this user'
        });
      }

      // Check for existing requests
      const existingRequest = await Friend.getExistingRequest(db, senderId, recipientId);

      if (existingRequest) {
        // Since we're deleting processed requests, only pending requests should exist
        if (existingRequest.sender_id === senderId) {
          await db.run('ROLLBACK');
          return reply.status(400).send({
            success: false,
            error: 'You already sent a friend request to this user'
          });
        } else {
          // If recipient has already sent a request, return an error instead of auto-accepting
          await db.run('ROLLBACK');
          return reply.status(400).send({
            success: false,
            error: 'This user has already sent you a friend request. Please accept their request instead.'
          });
        }
      } else {
        // No existing request, create a new one
        const requestData = await Friend.createRequest(db, senderId, recipientId);
        
        await db.run('COMMIT');

        return reply.send({
          success: true,
          message: 'Friend request sent',
          request: {
            id: requestData.id,
            username: requestData.username,
            displayName: requestData.display_name || requestData.username,
            requestType: 'outgoing',
            status: 'pending'
          }
        });
      }
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to send friend request'
    });
  }
}

// Accept a friend request
export async function acceptFriendRequest(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const db = await getDb();
    const userId = request.user.id;
    const { id: requestId } = request.params as { id: string };

    if (!requestId) {
      return reply.status(400).send({
        success: false,
        error: 'Request ID is required'
      });
    }

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Check if request exists
      const friendRequest = await Friend.getRequestById(db, parseInt(requestId));

      if (!friendRequest) {
        await db.run('ROLLBACK');
        return reply.status(404).send({
          success: false,
          error: 'Friend request not found'
        });
      }

      if (friendRequest.recipient_id !== userId) {
        await db.run('ROLLBACK');
        return reply.status(403).send({
          success: false,
          error: 'You are not authorized to accept this request'
        });
      }

      const senderId = friendRequest.sender_id;

      // Delete the request instead of updating status
      await Friend.deleteRequestById(db, parseInt(requestId));

      // Create friendships (bidirectional)
      await Friend.createFriendship(db, userId, senderId);

      // Get user info for response
      const userData = await db.get(
        `SELECT u.id, u.username, p.display_name
         FROM users u
         LEFT JOIN profiles p ON u.id = p.user_id
         WHERE u.id = ?`,
        senderId
      );

      await db.run('COMMIT');

      return reply.send({
        success: true,
        message: 'Friend request accepted',
        friend: {
          id: userData.id,
          username: userData.username,
          displayName: userData.display_name || userData.username
        }
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to accept friend request'
    });
  }
}

// Decline a friend request
export async function declineFriendRequest(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const db = await getDb();
    const userId = request.user.id;
    const { id: requestId } = request.params as { id: string };

    if (!requestId) {
      return reply.status(400).send({
        success: false,
        error: 'Request ID is required'
      });
    }

    // Check if request exists
    const friendRequest = await Friend.getRequestById(db, parseInt(requestId));

    if (!friendRequest) {
      return reply.status(404).send({
        success: false,
        error: 'Friend request not found'
      });
    }

    if (friendRequest.recipient_id !== userId) {
      return reply.status(403).send({
        success: false,
        error: 'You are not authorized to decline this request'
      });
    }

    // Delete the request instead of updating status
    await Friend.deleteRequestById(db, parseInt(requestId));

    return reply.send({
      success: true,
      message: 'Friend request declined'
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to decline friend request'
    });
  }
}

// Cancel a sent friend request
export async function cancelFriendRequest(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const db = await getDb();
    const userId = request.user.id;
    const { id: requestId } = request.params as { id: string };

    if (!requestId) {
      return reply.status(400).send({
        success: false,
        error: 'Request ID is required'
      });
    }

    // Check if request exists
    const friendRequest = await Friend.getRequestById(db, parseInt(requestId));

    if (!friendRequest) {
      return reply.status(404).send({
        success: false,
        error: 'Friend request not found'
      });
    }

    if (friendRequest.sender_id !== userId) {
      return reply.status(403).send({
        success: false,
        error: 'You are not authorized to cancel this request'
      });
    }

    // Delete the request instead of updating status
    await Friend.deleteRequestById(db, parseInt(requestId));

    return reply.send({
      success: true,
      message: 'Friend request cancelled'
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to cancel friend request'
    });
  }
}

// Remove a friend
export async function removeFriend(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const db = await getDb();
    const userId = request.user.id;
    const { id: friendId } = request.params as { id: string };

    if (!friendId) {
      return reply.status(400).send({
        success: false,
        error: 'Friend ID is required'
      });
    }

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Check if they are actually friends
      const areFriends = await Friend.areFriends(db, userId, parseInt(friendId));

      if (!areFriends) {
        await db.run('ROLLBACK');
        return reply.status(404).send({
          success: false,
          error: 'Friendship not found'
        });
      }

      // Delete friendship (bidirectional)
      await Friend.removeFriend(db, userId, parseInt(friendId));

      await db.run('COMMIT');

      return reply.send({
        success: true,
        message: 'Friend removed successfully'
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to remove friend'
    });
  }
}