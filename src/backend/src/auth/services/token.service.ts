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
  maxAge: 60 * 60,
  expires: new Date(Date.now() + 60 * 60 * 1000),
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/'
};

export const refreshCookieOptions: CookieOptions = {
  maxAge: 7 * 24 * 60 * 60,
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/api/auth/refresh'
};

export const cliCookieOptions: CookieOptions = {
  maxAge: 2 * 60 * 60,
  expires: new Date(Date.now() + 2 * 60 * 60 * 1000),
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/'
};

/*-------------------------------CREATE TOKENS------------------------------*/

export async function createPreAuthToken(user: any, reply: FastifyReply) {
  const preAuthToken = reply.server.jwtSign({ 
    id: user.id,
    username: user.username,
    email: user.email,
    token_type: 'preAuth'
  }, process.env.PREAUTH_TOKEN_SECRET as string, { expiresIn: '5m' });

  return preAuthToken;
}

export async function createAccessToken(user: any, reply: FastifyReply) {
  const accessToken = reply.server.jwtSign({ 
    id: user.id,
    username: user.username,
    email: user.email,
    token_type: 'access'
  }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '1h' });

  return accessToken;
}

export async function createCLIToken(user: any, reply: FastifyReply) {
  const cliToken = reply.server.jwtSign({ 
    id: user.id,
    username: user.username,
    email: user.email,
    token_type: 'cli'
  }, process.env.CLI_TOKEN_SECRET as string, { expiresIn: '2h' });

  return cliToken;
}

export async function createRefreshToken(db: Database, user: any, reply: FastifyReply) {
  const token = await RefreshToken.create(db, user.id);

  const refreshToken = reply.server.jwtSign({
    id: user.id,
    token_id: token,
    token_type: 'refresh'
  }, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: '7d' });

  return refreshToken;
}
