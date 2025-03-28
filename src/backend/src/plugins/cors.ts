import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fp from 'fastify-plugin';

export default fp(async function setupCors(server: FastifyInstance) {
    server.register(fastifyCors, {
        origin: 'https://localhost:8080', // Match nginx frontend url
        methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true // Enable credentials
    });
})