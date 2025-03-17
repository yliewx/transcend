import { FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcrypt';
import User from '../models/user';
import Profile from '../models/profile';
import { getDb } from '../db.js';
import { AuthenticatedRequest } from '../../@types/fastify';

interface RegistrationRequest {
  username: string;
  password: string;
  email: string;
}

// User registration handler
export async function registerUser(
    request: FastifyRequest<{ Body: RegistrationRequest }>,
    reply: FastifyReply
) {
    const { username, password, email } = request.body;

    // Validate input
    if (!username || !password || !email) {
        return reply.status(400).send({ 
          success: false, 
          error: 'All fields are required' 
        });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.status(400).send({ 
        success: false, 
        error: 'Please enter a valid email address' 
      });
    }

    // Password validation (at least 8 characters)
    if (password.length < 8) {
        return reply.status(400).send({ 
          success: false, 
          error: 'Password must be at least 8 characters long' 
        });
    }

    try {
        // Get database connection
        const db = await getDb();
        
        // Begin transaction
        await db.run('BEGIN TRANSACTION');
        
        try {
            // Create user
            const userResult = await User.create(db, { username, password, email });
            if (userResult.lastID === undefined) {
                throw new Error("Failed to create user: No user ID was generated");
            }
            const userId = userResult.lastID; // Now userId is guaranteed to be a number
            // Create profile
            await Profile.create(db, {
                user_id: userId,
                display_name: username // Use username as default display name
            });
            const profResult = Profile.findByUserId(db, userId);
            console.log(`profResult: ${profResult}`);
            // Commit transaction
            await db.run('COMMIT');
            
            return reply.status(201).send({ 
                success: true, 
                message: 'Registration successful' 
            });
        } catch (error) {
            // Rollback transaction if error occurs
            await db.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
            return reply.status(409).send({
                success: false,
                error: error.message
            });
        }
    
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            error: 'Registration failed. Please try again later.'
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

