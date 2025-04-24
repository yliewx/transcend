import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../../db.js';
import { Database } from 'sqlite';
import RefreshToken from '../../models/refresh.token';
import { AuthTokenPayload } from '../../../@types/global.js';

interface CookieOptions {
  maxAge: number;
  expires?: Date;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;  
}

export const accessCookieOptions: CookieOptions = {
  maxAge: 15 * 60, // expires after 15min (in seconds)
  expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes (in milliseconds)
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/'
};

export const refreshCookieOptions: CookieOptions = {
  maxAge: 7 * 24 * 60 * 60, // expires after 7 days (in seconds)
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days (in milliseconds)
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/api/auth/refresh'
};

/*-------------------------------CREATE TOKENS------------------------------*/

export async function createPreAuthToken(user: any, reply: FastifyReply) {
  // Create JWT pre-auth token with user data
  const preAuthToken = reply.server.jwtSign({ 
    id: user.id,
    username: user.username,
    email: user.email,
    token_type: 'preAuth'
  }, process.env.PREAUTH_TOKEN_SECRET as string, { expiresIn: '5m' });

  return preAuthToken;
}

export async function createAccessToken(user: any, reply: FastifyReply) {
  // Create access token with user data
  const accessToken = reply.server.jwtSign({ 
    id: user.id,
    username: user.username,
    email: user.email,
    token_type: 'access'
  }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '15m' });

  return accessToken;
}

export async function createRefreshToken(db: Database, user: any, reply: FastifyReply) {
  // Generate token_id and store in database
  const token = await RefreshToken.create(db, user.id);

  // Sign JWT refresh token using the token_id
  const refreshToken = reply.server.jwtSign({
    id: user.id,
    token_id: token,
    token_type: 'refresh'
  }, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: '7d' });

  return refreshToken;
}
