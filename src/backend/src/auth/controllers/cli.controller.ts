import { FastifyRequest, FastifyReply } from 'fastify';
import User from '../../models/user';
import { getDb } from '../../db.js';
import { cliCookieOptions, createCLIToken } from '../services/token.service';
import { AuthTokenPayload } from '../../../@types/global.js';

export async function generateCLIToken(request: FastifyRequest, reply: FastifyReply) {
  
    try {
      // Get user data from request
      const userData = request.user as AuthTokenPayload;
      
      const db = await getDb();
      const user = await User.findById(db, Number(userData.id));
  
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid user'
        });
      }
  
      // Create new access and refresh tokens
      const cliToken = await createCLIToken(user, reply);
  
      // Set access and refresh tokens in cookie
      reply.setCookie('cliToken', cliToken, cliCookieOptions);
  
      return reply.status(200).send({ 
          success: true,
          message: 'CLI token generated successfully',
      });
    }
    catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }