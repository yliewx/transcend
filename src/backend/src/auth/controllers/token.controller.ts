import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../../db.js';
import User from '../../models/user';
import { Database } from 'sqlite';
import RefreshToken from '../../models/refresh.token';
import { AuthTokenPayload } from '../../../@types/global.js';
import { createAccessToken, accessCookieOptions } from '../services/token.service.js';

/*---------------------------REFRESH ACCESS TOKEN---------------------------*/

// Route: /api/auth/refresh
export async function refreshAccessHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get refresh token data from request
    const userData = request.user as AuthTokenPayload;
    if (!userData) {
      throw new Error('User authentication failed');
    }
    const db = await getDb();
    const user = await User.findById(db, Number(userData.id));
    if (!user) {
      throw new Error('User not found');
    }

    // Verify refresh token with the database token_id
    await RefreshToken.verify(db, Number(userData.id), userData);

    // Create new access token and set it in cookie
    const accessToken = await createAccessToken(user, reply);
    reply.setCookie('accessToken', accessToken, accessCookieOptions);

    return reply.status(200).send({ 
      success: true,
      message: 'Access token refreshed successfully',
      accessTokenExpiry: await getTokenExpiry(accessToken, process.env.ACCESS_TOKEN_SECRET as string, request)
    });
  }
  catch (error) {
    return reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/*---------------------------CHECK TOKEN EXPIRY-----------------------------*/

async function getTokenExpiry(token: any, secret: string, request: FastifyRequest) {
  if (!token || !secret) return null;

  try {
    const decoded = await request.server.jwtVerify(token, secret) as AuthTokenPayload;

    return decoded.exp ? new Date(decoded.exp * 1000) : null;
  } catch (error) {
    return null;
  }
}

// Route: /api/auth/refresh/status
// Check validity and expiry of access token and refresh token
export async function getTokenStatus(request: FastifyRequest, reply: FastifyReply) {
  const accessToken = request.cookies.accessToken;
  const refreshToken = request.cookies.refreshToken;

  return reply.send({
    success: true,
    status: {
      accessTokenExpiry: await getTokenExpiry(accessToken, process.env.ACCESS_TOKEN_SECRET as string, request),
      refreshTokenExpiry: await getTokenExpiry(refreshToken, process.env.REFRESH_TOKEN_SECRET as string, request)
    }
  });
}
