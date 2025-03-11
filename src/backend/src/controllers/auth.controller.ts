import { FastifyReply, FastifyRequest } from 'fastify';

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
    // Create JWT token with username as payload
    const { username } = request.body as { username: string };
    const token = reply.server.jwt.sign({ username });

    // Store token in cookie
    reply.setCookie('token', token, { // setCookie(name, value, options)
        httpOnly: true, // prevent javascript access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
    });

    return { message: 'Logged in' };
}

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
    // Remove stored JWT cookie
    reply.clearCookie('token');
    return { message: 'Logged out' };
}

// Temp handler for testing
export async function profileHandler(request: FastifyRequest, reply: FastifyReply) {
    // Return the decoded JWT payload
    return { user: request.user };
}
