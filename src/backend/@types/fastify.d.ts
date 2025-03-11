import { FastifyInstance } from 'fastify';
import "@fastify/jwt";

// Extend FastifyInstance definition
declare module "fastify" {
    // Add the "authenticate" method (src/plugins/jwt.ts)
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }

    // // Add the "user" property (src/controllers/auth.controllers)
    // interface FastifyRequest {
    //     user: { username: string };
    // }
}
