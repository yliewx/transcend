import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';

export interface JwtPayload {
  id: number;
  username: string;
  email: string;
}

export default fp(async function setupJwt(server: FastifyInstance) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined!");
  }
  
  // Register JWT plugin
  server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET as string,
    cookie: {
      cookieName: 'authToken',
      signed: false,
    },
  });

  // Authentication decorator: attach method to the fastify instance
  // Verify pre-auth token
  server.decorate("preAuthenticate", async (request, reply) => {
    try {
      // Check if pre-auth token is present in cookie
      const preAuthToken = request.cookies.preAuthToken;
      if (!preAuthToken)
        throw new Error('No pre-authentication token found');

      // Decode JWT token and attach the decoded user data to the request
      request.user = await server.jwt.verify<JwtPayload>(preAuthToken);
    }
    catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
    
  // Verify auth token
  server.decorate("authenticate", async (request, reply) => {
    try {
      // Check if auth token is present in cookie
      const authToken = request.cookies.authToken;
      if (!authToken)
        throw new Error('No authentication token found');

      // Decode JWT token and attach the decoded user data to the request
      request.user = await server.jwt.verify<JwtPayload>(authToken);
    }
    catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
})
