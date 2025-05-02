import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import jwt from 'jsonwebtoken';
import fp from 'fastify-plugin';
import { AuthTokenPayload } from '../../@types/global';

export const jwtSecrets = new Map<string, string>([
  ['preAuth', process.env.PREAUTH_TOKEN_SECRET as string],
  ['access', process.env.ACCESS_TOKEN_SECRET as string],
  ['refresh', process.env.REFRESH_TOKEN_SECRET as string],
  ['cli', process.env.CLI_TOKEN_SECRET as string]
]);

/*-----------------------------HELPER FUNCTIONS-----------------------------*/

async function getJwtSecret(server: FastifyInstance, token: string): Promise<string> {
  const decoded = server.jwt.decode<AuthTokenPayload>(token);
  if (!decoded || !decoded.token_type) {
    throw new Error('Invalid token: Missing token type');
  }

  const secret = jwtSecrets.get(decoded.token_type);
  if (!secret) {
    throw new Error('Unknown token type');
  }

  return secret;
}

/*--------------------------------REGISTER JWT------------------------------*/

export default fp(async function setupJwt(server: FastifyInstance) {
  if (!process.env.PREAUTH_TOKEN_SECRET || !process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET || !process.env.CLI_TOKEN_SECRET) {
    throw new Error("JWT token secret is not defined!");
  }
  
  server.register(fastifyJwt, {
    secret: process.env.ACCESS_TOKEN_SECRET as string,
    cookie: {
      cookieName: 'authToken',
      signed: false,
    },
  });

  server.decorate('jwtSign', jwt.sign);
  server.decorate('jwtVerify', jwt.verify);
  server.decorate("preAuthenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const preAuthToken = request.cookies.preAuthToken;
      if (!preAuthToken)
        throw new Error('No pre-authentication token found');
      const secret = await getJwtSecret(server, preAuthToken);
      request.user = await server.jwtVerify(preAuthToken, secret) as AuthTokenPayload;
    }
    catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
    
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

  server.decorate("authenticateGame", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const cliToken = authHeader.substring(7); 
        const secret = await getJwtSecret(server, cliToken);
        request.user = await server.jwtVerify(cliToken, secret) as AuthTokenPayload;
      } 
      else {
        const accessToken = request.cookies.accessToken;
        if (!accessToken)
          throw new Error('No authentication token found');
        const secret = await getJwtSecret(server, accessToken);
        request.user = await server.jwtVerify(accessToken, secret) as AuthTokenPayload;
      }
    }
    catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

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

  server.decorate("authenticateUser", async (request: FastifyRequest) => {
    try {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const cliToken = authHeader.substring(7);
        const secret = await getJwtSecret(server, cliToken);
        request.user = await server.jwtVerify(cliToken, secret) as AuthTokenPayload;
        return request.user;
      } 
      else {
        const accessToken = request.cookies.accessToken;
        if (!accessToken)
          throw new Error('No authentication token found');
        const secret = await getJwtSecret(server, accessToken);
        request.user = await server.jwtVerify(accessToken, secret) as AuthTokenPayload;
        return request.user;
      }
    }
    catch (err) {
      throw err;
    }
  });
})
