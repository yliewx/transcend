import { FastifyReply, FastifyRequest } from 'fastify';
import User from '../models/user';
import Profile from '../models/profile';
import { getDb } from '../db.js';

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