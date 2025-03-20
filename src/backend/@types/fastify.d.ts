import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import "@fastify/jwt";

// Extend FastifyInstance
declare module "fastify" {
  // Add the "authenticate" method
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    preAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  // interface FastifyRequest {
  //   user?: {
  //     userId: number;
  //     username: string;
  //     email: string;
  //     iat: number;
  //   };
  // }
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: number;
    username: string;
    email: string;
  }
  body: any;
}