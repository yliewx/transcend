import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import User from '../models/user';
import Profile from '../models/profile';
import { getDb } from '../db.js';
import { AuthenticatedRequest } from '../../@types/fastify';

export async function profileHandler(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const userId = request.user.id;
      const db = await getDb();
      
      // Get user data
      const user = await User.findById(db, userId);
      
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }
      
      // Get profile data
      const profile = await Profile.findByUserId(db, userId);
      
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        profile: profile ? {
          displayName: profile.display_name,
          avatarPath: profile.avatar_path
        } : null
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to retrieve profile' });
    }
  }

  export async function updateProfileDataHandler(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const userId = request.user.id;
      // console.log('Updating profile for user:', userId);
      // console.log('Request body:', request.body);
      
      const { displayName } = request.body as { displayName?: string };
      //console.log('Display name to update:', displayName);
      
      if (displayName === undefined) {
        return reply.status(400).send({
          success: false,
          error: 'Display name is required'
        });
      }
      
      const db = await getDb();
      console.log('Database connection established');
      
      let profile = await Profile.findByUserId(db, userId);
      //console.log('Existing profile:', profile);
      
      profile = await Profile.updateDisplayName(db, userId, displayName);
            if (!profile) 
        throw new Error('Failed to update or retrieve profile after update');
      
      // console.log('Profile after update:', profile);
      
      return {
        success: true,
        profile: {
          displayName: profile.display_name,
          avatarPath: profile.avatar_path
        }
      };
    } catch (error) {
      //console.error('Profile update error:', error);
      request.log.error(error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to update profile' 
      });
    }
  }


export async function updateUserDataHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const userId = request.user.id;
    const { username, email } = request.body as { username?: string; email?: string };
    const db = await getDb();
    
    // Get current user data
    const user = await User.findById(db, userId);
    
    if (!user) {
      return reply.status(404).send({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Check if username is unique if it's being changed
    if (username && username !== user.username) {
      const existingUser = await User.findByUsername(db, username);
      if (existingUser && existingUser.id !== userId) {
        return reply.status(400).send({
          success: false,
          error: 'Username already taken'
        });
      }
    }
    
    // Check if email is unique if it's being changed
    if (email && email !== user.email) {
      const existingUser = await User.findByEmail(db, email);
      if (existingUser && existingUser.id !== userId) {
        return reply.status(400).send({
          success: false,
          error: 'Email already in use'
        });
      }
    }
    
    // Update user data
    const updatedUser = await User.update(db, userId, {
      username: username !== undefined ? username : user.username,
      email: email !== undefined ? email : user.email
    });
    
    return {
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email
      }
    };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ 
      success: false, 
      error: 'Failed to update user data' 
    });
  }
}

export async function updatePasswordHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const userId = request.user.id;
    const { currentPassword, newPassword } = request.body as { 
      currentPassword: string; 
      newPassword: string;
    };
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return reply.status(400).send({
        success: false,
        error: 'Current password and new password are required'
      });
    }
    
    // Password strength validation
    if (newPassword.length < 8) {
      return reply.status(400).send({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }
    
    const db = await getDb();
    
    // Get current user data
    const user = await User.findById(db, userId);
    
    if (!user) {
      return reply.status(404).send({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return reply.status(401).send({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await User.updatePassword(db, userId, passwordHash);
    
    // Log the password change (for security audit)
    request.log.info(`Password changed for user ${userId}`);
    
    return {
      success: true,
      message: 'Password updated successfully'
    };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ 
      success: false, 
      error: 'Failed to update password' 
    });
  }
}
