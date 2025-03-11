import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fp from 'fastify-plugin';

export default fp(async function setupCors(server: FastifyInstance) {
    // Enable CORS for the frontend running on port 8080
    server.register(fastifyCors, {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        // credentials: true // If you need to send cookies or authentication headers
    });
})