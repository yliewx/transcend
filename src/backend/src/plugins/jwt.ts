import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';

export interface AuthTokenPayload {
  id: number;
  username: string;
  email: string;
  token_type: string;
}

// Refresh token doesn't need user info
export interface RefreshTokenPayload {
  user_id: number;
  token_id: string;
  token_type: string;
}

export default fp(async function setupJwt(server: FastifyInstance) {
  if (!process.env.PREAUTH_TOKEN_SECRET || !process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("JWT token secret is not defined!");
  }
  
  // Register JWT plugin
  server.register(fastifyJwt, {
    secret: (request, token) => {
      if (token.token_type === 'preAuth') return process.env.PREAUTH_TOKEN_SECRET as string;
      if (token.token_type === 'access') return process.env.ACCESS_TOKEN_SECRET as string;
      if (token.token_type === 'refresh') return process.env.REFRESH_TOKEN_SECRET as string;
      throw new Error('Unknown token type');
    },
    cookie: {
      cookieName: 'authToken',
      signed: false,
    },
  });
  // server.register(fastifyJwt, {
  //   secret: process.env.ACCESS_TOKEN_SECRET as string,
  //   cookie: {
  //     cookieName: 'authToken',
  //     signed: false,
  //   },
  // });

  // Authentication decorator: attach method to the fastify instance
  // Verify pre-auth token
  server.decorate("preAuthenticate", async (request, reply) => {
    try {
      // Check if pre-auth token is present in cookie
      const preAuthToken = request.cookies.preAuthToken;
      if (!preAuthToken)
        throw new Error('No pre-authentication token found');

      // Decode JWT token and attach the decoded user data to the request
      request.user = await server.jwt.verify<AuthTokenPayload>(preAuthToken);
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
      request.user = await server.jwt.verify<AuthTokenPayload>(authToken);
    }
    catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
})
