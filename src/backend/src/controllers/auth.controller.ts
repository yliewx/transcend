import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import User from '../models/user';
import Profile from '../models/profile';
import { getDb } from '../db.js';
import { AuthenticatedRequest } from '../../@types/fastify';

interface LoginRequest {
  username: string;
  password: string;
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
    const { username, password } = request.body as LoginRequest;
    
    try {
        const db = await getDb();

        // Check if username exists
        const user = await User.findByUsername(db, username);
        
        if (!user) {
            return reply.code(401).send({ 
                error: 'Invalid username or password' 
            });
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return reply.code(401).send({ 
                error: 'Invalid username or password' 
            });
        }
        
        // Create JWT token with user data (excluding sensitive information)
        const token = reply.server.jwt.sign({ 
            id: user.id,
            username: user.username,
            email: user.email
        });
        
        // Store token in cookie
        reply.setCookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 24 * 60 * 60 // 1 day in seconds
        });
        
        return { 
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        };
    } catch (error) {
        console.error('Login error:', error);
        return reply.code(500).send({ 
            error: 'An error occurred during login'
        });
    }
}

// export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
//     reply.header('Access-Control-Allow-Credentials', 'true');
//     // Remove stored JWT cookie
//     reply.clearCookie('token');
//     return { message: 'Logged out' };
// }

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
      reply.header('Access-Control-Allow-Credentials', 'true');
      
      // Remove stored JWT cookie
      reply.clearCookie('token', {
        path: '/',
        httpOnly: true
      });
  
      return reply.send({ message: 'Logged out' });
    } catch (error) {
      console.error('Logout error:', error);
      return reply.status(500).send({ 
        message: 'Logout failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }


  // interface AuthenticatedRequest extends FastifyRequest {
  //   user: {
  //     id: number;
  //     username: string;
  //     email: string;
  //   }
  // }
  
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