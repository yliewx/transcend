import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import jwt from 'jsonwebtoken';
import fp from 'fastify-plugin';
import { AuthTokenPayload } from '../../@types/global';

export const jwtSecrets = new Map<string, string>([
  ['preAuth', process.env.PREAUTH_TOKEN_SECRET as string],
  ['access', process.env.ACCESS_TOKEN_SECRET as string],
  ['refresh', process.env.REFRESH_TOKEN_SECRET as string]
]);

/*-----------------------------HELPER FUNCTIONS-----------------------------*/

// Retrieve the secret for verification based on token type
async function getJwtSecret(server: FastifyInstance, token: string): Promise<string> {
  // Get token payload
  const decoded = server.jwt.decode<AuthTokenPayload>(token);
  if (!decoded || !decoded.token_type) {
    throw new Error('Invalid token: Missing token type');
  }

  // Determine which secret to use based on the token type
  const secret = jwtSecrets.get(decoded.token_type);
  if (!secret) {
    throw new Error('Unknown token type');
  }

  return secret;
}

/*--------------------------------REGISTER JWT------------------------------*/

// Define authentication middleware
export default fp(async function setupJwt(server: FastifyInstance) {
  if (!process.env.PREAUTH_TOKEN_SECRET || !process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("JWT token secret is not defined!");
  }
  
  // Register JWT plugin
  server.register(fastifyJwt, {
    secret: process.env.ACCESS_TOKEN_SECRET as string,
    cookie: {
      cookieName: 'authToken',
      signed: false,
    },
  });
  server.decorate('jwtSign', jwt.sign);
  server.decorate('jwtVerify', jwt.verify);

  // Verify pre-auth token
  server.decorate("preAuthenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check if token is present in cookie
      const preAuthToken = request.cookies.preAuthToken;
      if (!preAuthToken)
        throw new Error('No pre-authentication token found');

      // Check token_type to get secret used for verification
      const secret = await getJwtSecret(server, preAuthToken);
      // Decode JWT token and attach the decoded user data to the request
      request.user = await server.jwtVerify(preAuthToken, secret) as AuthTokenPayload;
    }
    catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
    
  // Verify auth token
  server.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const accessToken = request.cookies.accessToken;
      if (!accessToken)
        throw new Error('No authentication token found');

      const secret = await getJwtSecret(server, accessToken);
      request.user = await server.jwtVerify(accessToken, secret) as AuthTokenPayload;
    }
    catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Verify refresh token
  server.decorate("reAuthenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const refreshToken = request.cookies.refreshToken;
      if (!refreshToken)
        throw new Error('No refresh token found');

      const secret = await getJwtSecret(server, refreshToken);
      request.user = await server.jwtVerify(refreshToken, secret) as AuthTokenPayload;
    }
    catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Verify auth token: websocket routes
  server.decorate("authenticateUser", async (request: FastifyRequest) => {
    try {
      const accessToken = request.cookies.accessToken;
      if (!accessToken)
        throw new Error('No authentication token found');

      const secret = await getJwtSecret(server, accessToken);
      request.user = await server.jwtVerify(accessToken, secret) as AuthTokenPayload;
      return request.user;
    }
    catch (err) {
      throw err;
    }
  });
})
