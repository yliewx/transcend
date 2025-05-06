import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../../db.js';
import User from '../../models/user';
import { Database } from 'sqlite';
import RefreshToken from '../../models/refresh.token';
import { AuthTokenPayload } from '../../../@types/global.js';
import { createAccessToken, accessCookieOptions } from '../services/token.service.js';

/*---------------------------REFRESH ACCESS TOKEN---------------------------*/

export async function refreshAccessHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userData = request.user as AuthTokenPayload;
    if (!userData) {
      throw new Error('User authentication failed');
    }
    const db = await getDb();
    const user = await User.findById(db, Number(userData.id));
    if (!user) {
      throw new Error('User not found');
    }

    await RefreshToken.verify(db, Number(userData.id), userData);

    const accessToken = await createAccessToken(user, reply);
    reply.setCookie('accessToken', accessToken, accessCookieOptions);

    return reply.status(200).send({ 
      success: true,
      message: 'Access token refreshed successfully',
      accessTokenExpiry: await getTokenExpiry(accessToken, process.env.ACCESS_TOKEN_SECRET as string, request)
    });
  }
  catch (error) {
    return reply.status(400).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/*---------------------------CHECK TOKEN EXPIRY-----------------------------*/

async function decodeJwt(token: any, secret: string, request: FastifyRequest) {
  if (!token || !secret) return null;

  try {
    return await request.server.jwtVerify(token, secret) as AuthTokenPayload;
  } catch {
    return null;
  }
}

async function getTokenExpiry(token: any, secret: string, request: FastifyRequest) {
  const decoded = await decodeJwt(token, secret, request);
  if (!decoded || !decoded.exp) {
    return null;
  }
  return new Date(decoded.exp * 1000);
}

export async function getTokenStatus(request: FastifyRequest, reply: FastifyReply) {
  const accessToken = request.cookies.accessToken;
  const refreshToken = request.cookies.refreshToken;

  const accessDecoded = await decodeJwt(accessToken, process.env.ACCESS_TOKEN_SECRET as string, request);
  const refreshDecoded = await decodeJwt(refreshToken, process.env.REFRESH_TOKEN_SECRET as string, request);

  if (accessDecoded?.id ) {
    const db = await getDb();
    const user = await User.findById(db, accessDecoded.id);
    if (!user) {
      return reply.send({
        success: false,
        error: 'Token user does not exist in database'
      });
    }
  }

  return reply.send({
    success: true,
    status: {
      userId: accessDecoded?.id ?? null,
      accessTokenExpiry: accessDecoded?.exp ? new Date(accessDecoded.exp * 1000) : null,
      refreshTokenExpiry: refreshDecoded?.exp ? new Date(refreshDecoded.exp * 1000) : null,
    }
  });
}
