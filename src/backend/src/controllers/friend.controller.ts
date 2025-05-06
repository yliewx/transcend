import { FastifyReply } from 'fastify';
import { getDb } from '../db.js';
import { AuthenticatedRequest } from '../../@types/fastify';
import User from '../models/user';
import Friend from '../models/friend';
import { onlineUsers } from '../game/ws.types.js';
import { Database } from 'sqlite';

interface FriendRecord {
  id: number;
  user_id: number;
  username: string;
  display_name?: string;
  created_at: string;
}

/*-----------------------------NOTIFY RECIPIENT-----------------------------*/

async function formatIncomingRequest(
  db: Database,
  requestId: number,
  recipientId: number,
  requestStatus: 'pending' | 'accepted' | 'declined' | 'cancelled'
) {
  if (requestStatus !== 'pending') {
    return { id: requestId };
  }

  const request = await Friend.getIncomingRequestById(db, requestId, recipientId);
  if (!request) return null;

  const formattedRequest = {
    id: request.id,
    username: request.username,
    displayName: request.display_name ?? request.username,
    requestType: 'incoming',
    status: request.status ?? 'pending',
    requestDate: new Date(request.created_at).toISOString(),
  };

  return formattedRequest;
}

async function formatSenderData(db: Database, senderId: number) {
  const senderData = await db.get(
    `SELECT u.id, u.username, p.display_name
     FROM users u
     LEFT JOIN profiles p ON u.id = p.user_id
     WHERE u.id = ?`,
    senderId
  );

  return senderData
    ? {
        ...senderData,
        displayName: senderData.display_name ?? senderData.username,
        online: onlineUsers.has(senderId),
      }
    : null;
}

async function notifyRecipient(
  db: Database,
  requestId: number,
  recipientId: number,
  senderId: number,
  requestStatus: 'pending' | 'accepted' | 'declined' | 'cancelled',
  message: string
) {
  const request = await formatIncomingRequest(db, requestId, recipientId, requestStatus);
  const sender = await formatSenderData(db, senderId);

  const recipientSocket = onlineUsers.get(recipientId);
  if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
    recipientSocket.send(JSON.stringify({
      type: 'friend-request',
      data: {
        friend: sender,
        request: request,
        requestStatus: requestStatus,
        message: message
      }
    }));
  }
}

async function notifyRemovedFriend(friendId: number, userId: number) {
  const friendSocket = onlineUsers.get(friendId);
  if (friendSocket && friendSocket.readyState === WebSocket.OPEN) {
    friendSocket.send(JSON.stringify({
      type: 'friend-removed',
      data: {
        friendId: userId,
        message: 'You were removed from someone\'s friends list'
      }
    }));
  }
}

/*------------------------------FRIEND ROUTES-------------------------------*/

export async function getFriends(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const db = await getDb();
    const userId = request.user.id;

    const friends: FriendRecord[] = await Friend.getFriendsList(db, userId);

    return reply.send({
      success: true,
      friends: friends.map(friend => ({
        id: friend.user_id,
        username: friend.username,
        displayName: friend.display_name || friend.username,
        online: onlineUsers.has(friend.user_id)
      }))
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      error: 'Failed to retrieve friends list'
    });
  }
}

export async function getPendingRequests(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const db = await getDb();
    const userId = request.user.id;
    const incomingRequests = await Friend.getIncomingRequests(db, userId);    
    const outgoingRequests = await Friend.getOutgoingRequests(db, userId);

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
    return reply.status(400).send({
      success: false,
      error: 'Failed to retrieve pending requests'
    });
  }
}

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
    return reply.status(400).send({
      success: false,
      error: 'Search failed'
    });
  }
}

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

    const recipient = await User.findById(db, recipientId);
    if (!recipient) {
      return reply.status(404).send({
        success: false,
        error: 'User not found'
      });
    }

    await db.run('BEGIN TRANSACTION');

    try {
      const areFriends = await Friend.areFriends(db, senderId, recipientId);
      
      if (areFriends) {
        await db.run('ROLLBACK');
        return reply.status(400).send({
          success: false,
          error: 'You are already friends with this user'
        });
      }

      const existingRequest = await Friend.getExistingRequest(db, senderId, recipientId);

      if (existingRequest) {
        if (existingRequest.sender_id === senderId) {
          await db.run('ROLLBACK');
          return reply.status(400).send({
            success: false,
            error: 'You already sent a friend request to this user'
          });
        } else {
          await db.run('ROLLBACK');

          return reply.status(400).send({
            success: false,
            error: 'This user has already sent you a friend request. Please accept their request instead.'
          });
        }
      } else {
        const requestData = await Friend.createRequest(db, senderId, recipientId);
        
        await db.run('COMMIT');

        await notifyRecipient(
          db,
          requestData.id,
          recipientId,
          senderId,
          'pending',
          'You received a friend request'
        );

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
    return reply.status(400).send({
      success: false,
      error: 'Failed to send friend request'
    });
  }
}

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

    await db.run('BEGIN TRANSACTION');

    try {
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
      const recipientId = friendRequest.recipient_id;

      await Friend.deleteRequestById(db, parseInt(requestId));

      await Friend.createFriendship(db, userId, senderId);

      const userData = await db.get(
        `SELECT u.id, u.username, p.display_name
         FROM users u
         LEFT JOIN profiles p ON u.id = p.user_id
         WHERE u.id = ?`,
        senderId
      );

      await db.run('COMMIT');

      await notifyRecipient(
        db,
        parseInt(requestId),
        senderId,
        recipientId,
        'accepted',
        'Your friend request was accepted'
      );

      return reply.send({
        success: true,
        message: 'Friend request accepted',
        friend: {
          id: userData.id,
          username: userData.username,
          displayName: userData.display_name || userData.username,
          online: onlineUsers.has(userData.id)
        }
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      error: 'Failed to accept friend request'
    });
  }
}

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

    const senderId = friendRequest.sender_id;

    await Friend.deleteRequestById(db, parseInt(requestId));

    await notifyRecipient(
      db,
      parseInt(requestId),
      senderId,
      userId,
      'declined',
      'Your friend request was declined'
    );

    return reply.send({
      success: true,
      message: 'Friend request declined'
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      error: 'Failed to decline friend request'
    });
  }
}

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

    const recipientId = friendRequest.recipient_id;

    await Friend.deleteRequestById(db, parseInt(requestId));

    await notifyRecipient(
      db,
      parseInt(requestId),
      recipientId,
      userId,
      'cancelled',
      'Your friend request was cancelled'
    );

    return reply.send({
      success: true,
      message: 'Friend request cancelled'
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      error: 'Failed to cancel friend request'
    });
  }
}

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

    await db.run('BEGIN TRANSACTION');

    try {
      const areFriends = await Friend.areFriends(db, userId, parseInt(friendId));

      if (!areFriends) {
        await db.run('ROLLBACK');
        return reply.status(404).send({
          success: false,
          error: 'Friendship not found'
        });
      }

      await Friend.removeFriend(db, userId, parseInt(friendId));

      await db.run('COMMIT');

      await notifyRemovedFriend(parseInt(friendId), userId);

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
    return reply.status(400).send({
      success: false,
      error: 'Failed to remove friend'
    });
  }
}