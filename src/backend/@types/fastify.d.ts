// import { FastifyInstance } from 'fastify';
// import "@fastify/jwt";

// // Extend FastifyInstance definition
// declare module "fastify" {
//     // Add the "authenticate" method (src/plugins/jwt.ts)
//     interface FastifyInstance {
//         authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//     }

//     // // Add the "user" property (src/controllers/auth.controllers)
//     // interface FastifyRequest {
//     //     user: { username: string };
//     // }
// }


// @types/fastify.d.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import "@fastify/jwt";

// Extend FastifyInstance
declare module "fastify" {
  // Add the "authenticate" method
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Create a separate interface without modifying FastifyRequest
export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: number;
    username: string;
    email: string;
  }
}