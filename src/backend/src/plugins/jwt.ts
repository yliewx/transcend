import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';

export default fp(async function setupJwt(server: FastifyInstance) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined!");
  }
  
  // Register JWT plugin
  server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET as string,
    // cookie: {
    //     signed: false,
    // },
  });

  // Authentication decorator: attach method to the fastify instance
  // Verify pre-auth token
  server.decorate("preAuthenticate", async (request, reply) => {
    try {
      // Check if pre-auth token is present in cookie
      const preAuthToken = request.cookies.preAuthToken;
      if (!preAuthToken)
        throw new Error('No pre-authentication token found');

      await server.jwt.verify(preAuthToken);
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

      await server.jwt.verify(authToken);
    }
    catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
  // Verify JWT from cookies
  // server.decorate("authenticate", async (request, reply) => {
  //   try {
  //     // Check whether route uses pre-authentication token
  //     if (request.routeConfig?.requiresPreAuth) {
  //       await request.jwtVerify({ key: 'preAuthToken' });
  //     }
  //     // Else use regular auth token
  //     else {
  //       await request.jwtVerify();
  //     }
  //   }
  //   catch (err) {
  //     reply.status(401).send({ error: 'Unauthorized' });
  //   }
  // });
})
