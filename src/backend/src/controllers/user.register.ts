import { FastifyReply, FastifyRequest } from 'fastify';
import User from '../models/user';

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

    try
    {
        // Register user
        await User.create({ username, password, email });
    
        return reply.status(201).send({ 
            success: true, 
            message: 'Registration successful' 
        });
    }
    catch (error)
    {
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
