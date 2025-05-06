import { FastifyRequest, FastifyReply } from 'fastify';

/*------------------------------LOGOUT HANDLER------------------------------*/

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    reply.header('Access-Control-Allow-Credentials', 'true');
    
    reply.clearCookie('preAuthToken', { path: '/api/otp/' });
    reply.clearCookie('accessToken', { path: '/' });
    reply.clearCookie('refreshToken', { path: '/api/auth/refresh' });

    return reply.send({ message: 'Logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    return reply.status(400).send({ 
      message: 'Logout failed', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
  