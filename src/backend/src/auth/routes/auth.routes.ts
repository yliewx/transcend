import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { loginHandler, googleAuthCallbackHandler } from '../controllers/login.controller';
import { logoutHandler } from '../controllers/logout.controller';
import { generateOtp, verifyOtp, generateQRCode, otpPreferenceHandler } from '../controllers/otp.controller';
import { refreshAccessHandler, getTokenStatus } from '../controllers/token.controller';
import { generateCLIToken } from '../controllers/cli.controller';
import fp from 'fastify-plugin';

export default fp(async function authRoutes(server: FastifyInstance) {
  server.post('/api/login', loginHandler);
  server.post('/api/logout', logoutHandler);
  server.post('/api/otp/preferences', { preHandler: server.preAuthenticate }, otpPreferenceHandler);
  server.post('/api/otp/generate', { preHandler: server.preAuthenticate }, generateOtp);
  server.post('/api/otp/verify', { preHandler: server.preAuthenticate }, verifyOtp);
  server.get('/api/otp/qrcode', { preHandler: server.preAuthenticate }, generateQRCode);
  server.get('/api/auth/google/client', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return { success: false, error: 'Google Client ID not found' }
    }
    return { success: true, googleClientId: process.env.GOOGLE_CLIENT_ID };
  });
  server.post('/api/auth/google/callback', googleAuthCallbackHandler);
  server.post('/api/auth/refresh', { preHandler: server.reAuthenticate }, refreshAccessHandler);
  server.get('/api/auth/refresh/status', getTokenStatus);
  server.post('/api/cli/generate', { preHandler: server.authenticate }, generateCLIToken);
});
