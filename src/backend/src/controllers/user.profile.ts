import {FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import User from '../models/user';
import Profile from '../models/profile';
import { getDb } from '../db.js';
import { AuthenticatedRequest } from '../../@types/fastify';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import { avatarsDir, publicDir, uploadsDir } from '../constants';

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


export async function uploadAvatarHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    // Get the authenticated user's ID
    const userId = request.user.id;
    
    // Process the uploaded file using Fastify Multipart
    const data = await request.file();
    
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }
    
    // Validate the file type
    const allowedMimeTypes = ['image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Only JPG or PNG images are allowed' });
    }
    
    // Generate a unique filename to prevent collisions
    const fileExtension = data.filename.split('.').pop() || 'jpg';
    //const filename = `user_${userId}_${uuidv4()}.${fileExtension}`;
    const filename = `${uuidv4()}.${fileExtension}`; // <<<< no user id!
    const filePath = path.join(avatarsDir, filename);
    
    // Save the file to disk
    await pipeline(data.file, fs.createWriteStream(filePath));
    
    // Create a public URL path for the avatar
    const avatarPath = `/uploads/avatars/${filename}`;
    
    // Update the user's profile in the database
    const db = await getDb();
    
    // First, check if we need to delete an old avatar file
    const existingProfile = await db.get(
      'SELECT avatar_path FROM profiles WHERE user_id = ?',
      [userId]
    );
    
    if (existingProfile && existingProfile.avatar_path) {
      // Extract the filename from the path
      const oldFilename = existingProfile.avatar_path.split('/').pop();
      if (oldFilename) {
        const oldFilePath = path.join(avatarsDir, oldFilename);
        // Check if file exists before attempting to delete
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath); // Delete the old file
        }
      }
    }
    
    // Update the profile with the new avatar path
    await db.run(
      `INSERT INTO profiles (user_id, avatar_path) 
       VALUES (?, ?) 
       ON CONFLICT(user_id) 
       DO UPDATE SET avatar_path = ?`,
      [userId, avatarPath, avatarPath]
    );
    
    return reply.status(200).send({ success: true });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return reply.status(500).send({ 
      error: 'Failed to process avatar upload'
    });
  }
}

export async function getAvatarHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  const userId = request.user.id;  
  const db = await getDb();
  const profile = await Profile.findByUserId(db, userId);
  let filename: string;
  
  if (profile && profile.avatar_path) {
    filename = profile.avatar_path.split('/').pop();
  } else {
    filename = 'default-avatar.png';
  }
  
  // Check if file exists
  const avatarFilePath = path.join(avatarsDir, filename);
  const fileExists = fs.existsSync(avatarFilePath);
  
  if (fileExists) {    
    // Set Cache-Control header
    reply.header('Cache-Control', 'public, max-age=3600');
    // Let Fastify handle the file sending
    return reply.sendFile(filename, avatarsDir);
  } else {
    return reply.code(404).send('Avatar not found');
  }
}