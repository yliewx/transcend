import { FastifyInstance } from 'fastify';
import { registerUser } from './db';

interface RegistrationRequest {
  username: string;
  password: string;
  email: string;
}

export function registerRoutes(server: FastifyInstance) {
  // User registration
  server.post<{ Body: RegistrationRequest }>('/api/register', async (request, reply) => {
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
      // Register user
      await registerUser(username, password, email);
      
      return reply.status(201).send({ 
        success: true, 
        message: 'Registration successful' 
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          return reply.status(409).send({ 
            success: false, 
            error: error.message 
          });
        }
      }
      
      request.log.error(error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Registration failed. Please try again later.' 
      });
    }
  });
  
  // // Catch-all route for SPA
  // server.get('*', (request, reply) => {
  //   reply.sendFile('index.html');
  // });
  server.setNotFoundHandler((request, reply) => {
    // Only handle GET requests for HTML pages
    if (request.method !== 'GET' || !request.headers.accept?.includes('text/html')) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    reply.sendFile('index.html');
  });
}
