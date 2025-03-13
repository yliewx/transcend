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
        //     cookieName: 'token',
        //     signed: false,
        // },
    });

    // Authentication decorator: attach method to the fastify instance
    // Verify JWT from cookies
    server.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await request.jwtVerify();
        }
        catch (err) {
            reply.status(401).send({ error: 'Unauthorized' });
        }
    });
})
