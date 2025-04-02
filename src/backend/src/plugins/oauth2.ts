import { FastifyInstance } from "fastify";
import fp from 'fastify-plugin';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
// import fastifyOauth2 from '@fastify/oauth2';

export default fp(async function setupGoogleAuth(server: FastifyInstance) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    server.log.error('Google Client ID is missing');
    throw new Error('Missing Google Client configuration');
  }

  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  server.decorate('verifyGoogleToken', async (idToken: string): Promise<TokenPayload | null> => {
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      return ticket.getPayload() ?? null; // Returns user info (or null if undefined)
    } catch (error) {
      server.log.error('Invalid Google ID token');
      return null;
    }
  });
});

// export default fp(async function setupGoogleAuth(server: FastifyInstance) {
//   server.register(fastifyOauth2, {
//     name: 'googleOAuth2',
//     scope: ['profile', 'email'],
//     credentials: {
//       client: {
//         id: process.env.GOOGLE_CLIENT_ID!,
//         secret: process.env.GOOGLE_CLIENT_SECRET!,
//       },
//       auth: fastifyOauth2.GOOGLE_CONFIGURATION,
//     },
//     startRedirectPath: '/api/auth/google',
//     callbackUri: process.env.GOOGLE_REDIRECT_URI!,
//   });
// });
