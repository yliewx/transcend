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
import { avatarsDir } from '../constants';


export async function profileHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const userId = request.user.id;
    const db = await getDb();
  
    const user = await User.findById(db, userId);  
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }
    
    const profile = await Profile.findByUserId(db, userId);
    
    return {
      success: true,
      userData: {
        id: user.id,
        username: user.username,
        email: user.email,
        otp_option: user.otp_option 
      },
      profileData: profile ? {
        displayName: profile.display_name,
        avatarPath: profile.avatar_path
      } : null
    };
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({ 
      success: false,
      error: 'Failed to retrieve profile' 
    });
  }
}

export async function updateProfileDataHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const userId = request.user.id;
    const { displayName } = request.body as { displayName?: string };
    
    if (displayName === undefined) {
      return reply.status(400).send({
        success: false,
        error: 'Display name is required'
      });
    }
    
    const db = await getDb();
    let profile = await Profile.findByUserId(db, userId);

    profile = await Profile.updateDisplayName(db, userId, displayName);
    if (!profile) 
      throw new Error('Failed to update or retrieve profile after update');
          
    return {
      success: true,
      profile: {
        displayName: profile.display_name,
        avatarPath: profile.avatar_path
      }
    };
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({ 
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
    
    const user = await User.findById(db, userId);
    
    if (!user) {
      return reply.status(404).send({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    if (username && username !== user.username) {
      const existingUser = await User.findByUsername(db, username);
      if (existingUser && existingUser.id !== userId) {
        return reply.status(400).send({
          success: false,
          error: 'Username already taken'
        });
      }
    }
    
    if (email && email !== user.email) {
      const existingUser = await User.findByEmail(db, email);
      if (existingUser && existingUser.id !== userId) {
        return reply.status(400).send({
          success: false,
          error: 'Email already in use'
        });
      }
    }
    
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
    return reply.status(400).send({ 
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

    const db = await getDb();
    
    const user = await User.findById(db, userId);
    if (!user) {
      return reply.status(404).send({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    if (user.otp_option === 'app') {
      return reply.status(403).send({
        success: false,
        error: 'Password cannot be changed when using authenticator app'
      });
    }
    
    if (!currentPassword || !newPassword) {
      return reply.status(400).send({
        success: false,
        error: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return reply.status(400).send({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }
    
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return reply.status(401).send({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);    
    await User.updatePassword(db, userId, passwordHash);    
    
    return {
      success: true,
      message: 'Password updated successfully'
    };
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({ 
      success: false, 
      error: 'Failed to update password' 
    });
  }
}

export async function uploadAvatarHandler(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const userId = request.user.id;
    
    const data = await request.file();    
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }
    
    const allowedMimeTypes = ['image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Only JPG or PNG images are allowed' });
    }
    
    const fileExtension = data.filename.split('.').pop() || 'jpg';
    const filename = `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(avatarsDir, filename);
    await pipeline(data.file, fs.createWriteStream(filePath));
    const avatarPath = `/uploads/avatars/${filename}`;  
    const db = await getDb();
    
    const existingProfile = await db.get(
      'SELECT avatar_path FROM profiles WHERE user_id = ?',
      [userId]
    );
    
    if (existingProfile && existingProfile.avatar_path) {
      const oldFilename = existingProfile.avatar_path.split('/').pop();
      if (oldFilename) {
        const oldFilePath = path.join(avatarsDir, oldFilename);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }
    
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
    return reply.status(400).send({ 
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
    filename = 'default-avatar.jpg';
  }
  
  const avatarFilePath = path.join(avatarsDir, filename);
  const fileExists = fs.existsSync(avatarFilePath);
  
  if (fileExists) {    
    reply.header('Cache-Control', 'public, max-age=3600');
    return reply.sendFile(filename, avatarsDir);
  } else {
    return reply.code(404).send('Avatar not found');
  }
}