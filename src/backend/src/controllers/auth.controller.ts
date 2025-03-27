import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import User from '../models/user';
import Profile from '../models/profile';
import RefreshToken from '../models/refresh.token';
import { getDb } from '../db.js';
import { Database } from 'sqlite';
import OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import { AuthTokenPayload, jwtSecrets } from '../plugins/jwt';

interface LoginRequest {
  username: string;
  password: string;
}

/* Login process

1. loginHandler:
  - [REQUEST]: username, password
  - Check if user exists in database & verify password
  - Create pre-authentication token with expiry (to identify the user during OTP verification)
  - [RESPONSE]: pre-auth token, preferred OTP option

2. generateOtp: [Request requires: pre-auth token, user's selected OTP option]
  - Verify pre-auth token to get user
  - Verify OTP option: email, sms, (authenticator) app
  - Generate OTP token & store user-specific otp_secret in database
  - Send OTP token via chosen OTP option

3. verifyOtp:
  - Verify pre-auth token to get user
  - Verify OTP
  - Issue JWT token if 2FA is successful */

/*-------------------------------CREATE TOKENS------------------------------*/

async function createPreAuthToken(user: any, reply: FastifyReply) {
  // Create JWT pre-auth token with user data
  const preAuthToken = reply.server.jwtSign({ 
    id: user.id,
    username: user.username,
    email: user.email,
    token_type: 'preAuth'
  }, process.env.PREAUTH_TOKEN_SECRET as string, { expiresIn: '5m' });

  return preAuthToken;
}

async function createAccessToken(user: any, reply: FastifyReply) {
  // Create access token with user data
  const accessToken = reply.server.jwtSign({ 
    id: user.id,
    username: user.username,
    email: user.email,
    token_type: 'access'
  }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '15m' });

  return accessToken;
}

async function createRefreshToken(db: Database, user: any, reply: FastifyReply) {
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

/*-------------------------------LOGIN HANDLER------------------------------*/

async function validateUserCredentials(db: Database, username: string, password: string) {
  const user = await User.findByUsername(db, username);
  if (!user)
    return null;

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword)
    return null;

  return user;
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const { username, password } = request.body as LoginRequest;
  
  try {
    const db = await getDb();

    // 1. Check if user exists & verify password
    let user = await validateUserCredentials(db, username, password);
    if (!user) {
      return reply.code(401).send({ 
        success: false,
        error: 'Invalid username or password' 
      });
    }

    // 2. Check if valid refresh token exists
    // HAS REFRESH TOKEN: issue access token without going through OTP
    // const refreshToken = request.cookies.refreshToken;
    // if (refreshToken) {
    //   try {
    //     // Decode refresh token
    //     const decoded = await reply.server.jwtVerify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as AuthTokenPayload;

    //     // Validate refresh token
    //     await RefreshToken.verify(db, user.id, decoded);

    //     // Valid refresh token: skip OTP verification and issue new access token
    //     reply.setCookie('accessToken', await createAccessToken(user, reply), {
    //       maxAge: 1 * 60, // expires after 1min FOR TESTING
    //       httpOnly: true,
    //       secure: true,
    //       sameSite: 'strict',
    //       path: '/api/'
    //     });

    //     return reply.status(200).send({
    //       success: true,
    //       message: 'Login successful (refresh token used)',
    //       user: {
    //         id: user.id,
    //         username: user.username,
    //         email: user.email
    //       }
    //     });
    //   } catch (error) {
    //     // Continue with OTP verification
    //     console.log('Invalid refresh token:', error.message);
    //   }
    // }

    // NO REFRESH TOKEN: require OTP verification
    // 3. Get preferred OTP option. If not set (first time), frontend will prompt user to set a otp_option
    const otp_option = await User.getPreferred2FAMethod(db, user.id);

    // Set pre-auth token in cookie
    reply.setCookie('preAuthToken', await createPreAuthToken(user, reply), {
      maxAge: 5 * 60, // expires after 5min
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/otp/'
    });
    
    return reply.status(202).send({ 
        success: true,
        message: 'Two-factor authentication is required to login',
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            otp_option: otp_option
        }
    });
  }
  catch (error) {
    console.error('Login error:', error);
    return reply.code(500).send({ 
      error: 'An error occurred during login'
    });
  }
}

/*------------------------------2FA PREFERENCES-----------------------------*/

// Route: /api/otp/preference
// Accessed from: /otp/setup -> enable 2FA
export async function otpPreferenceHandler(request: FastifyRequest, reply: FastifyReply) {
  // Extract required fields from request body
  const { otp_option, otp_contact } = request.body as { otp_option: string, otp_contact?: string | null };
  if (!otp_option) {
    return reply.status(400).send({ error: 'User OTP option is required' });
  }

  try {
    // Get user data from request
    const userData = request.user as AuthTokenPayload;
    if (!userData) {
      throw new Error('User authentication failed');
    }
    const db = await getDb();
    await User.updateOtpOption(db, Number(userData.id), otp_option, otp_contact);

    reply.send({
      success: true, 
      message: `OTP option updated as ${otp_option}`
    });
  } catch (error) {
    reply.status(400).send({
      error: error instanceof Error ? error.message : 'Failed to update OTP option' 
    });
  }
}

/*-------------------------------GENERATE OTP-------------------------------*/

export async function generateQRCode(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get user data from request
    const userData = request.user as AuthTokenPayload;
    if (!userData) {
      throw new Error('User authentication failed');
    }
    const db = await getDb();
    await generateOtpToken(db, Number(userData.id));

    const secret = await User.getOtpSecret(db, Number(userData.id));
    const otpAuthUrl = await User.getOtpAuthUrl(db, Number(userData.id));
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Store secret and auth url in database
    await User.setOtpSecret(db, userData.id, secret.base32, otpAuthUrl);

    return reply.status(202).send({
      success: true,
      qrCode: qrCodeDataUrl,
      secret: secret.base32
    });
  } catch (error) {
    return reply.status(400).send({ success: false });
  }
}

// Handle sending OTP based on preferred otp_option
// async function sendOtp(db: Database, user: any, otpToken: string) {
//   if ((user.otp_option === 'sms' || user.otp_option === 'email') && !user.otp_contact) {
//     throw new Error('Phone number is required for SMS 2FA');
//   }
//   // if (user.otp_option === 'email' ) {
//   //   await sendEmailOtp(user.email, otpToken);
//   // }
// }

async function sendOtp(request: FastifyRequest, db: Database, user: any, otpToken: string) {
  if (user.otp_option === 'app') return;

  if (user.otp_option === 'email' && !user.email) {
    throw new Error('Email address is required for Email 2FA');
  }
  
  switch (user.otp_option) {
    case 'email':
      return await request.server.mailer.sendEmailOtp(user.otp_contact, otpToken);
    // Handle other OTP methods...
    default:
      throw new Error(`Unsupported OTP method: ${user.otp_option}`);
  }
}

// Update the function signature to accept server
// async function sendOtp(server: FastifyInstance, db: Database, user: any, otpToken: string) {
//   if (user.otp_option === 'email' && !user.email) {
//     throw new Error('Email address is required for Email 2FA');
//   }
  
//   switch (user.otp_option) {
//     case 'email':
//       if (!server.mailer) {
//         console.error("Mailer plugin not found");
//         throw new Error("Email service not available");
//       }
//       return await server.mailer.sendEmailOtp(user.email, otpToken);
//     default:
//       throw new Error(`Unsupported OTP method: ${user.otp_option}`);
//   }
// }

async function generateOtpToken(db: Database, user_id: number)
{
  // Generate user secret if it doesn't exist (first time login)
  let userSecret = await User.getOtpSecret(db, user_id);
  if (!userSecret)
    userSecret = new OTPAuth.Secret();

  // Instantiate TOTP object
  const totp = new OTPAuth.TOTP({
    issuer: 'ft_transcendence',
    algorithm: 'SHA256',
    digits: 6,
    period: 90,
    secret: userSecret
  });

  // Generate OTP as string
  const token = totp.generate();

  // Store secret and auth url in database
  await User.setOtpSecret(db, user_id, totp.secret.base32, totp.toString());

  return token;
}

// Route: /api/otp/generate
export async function generateOtp(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get user data from request
    const userData = request.user as AuthTokenPayload;
    if (!userData) {
      throw new Error('User authentication failed');
    }
    const db = await getDb();
    const user = await User.findById(db, Number(userData.id));

    // Check if OTP option is set
    if (user.otp_option === null) {
      throw new Error('Preferred 2FA option not set');
    }

    // Generate OTP
    const otpToken = await generateOtpToken(db, user.id);

    // TO-DO: Send OTP
    await sendOtp(request, db, user, otpToken);

    return reply.code(202).send({
      success: true,
      message: `OTP will be sent via ${user.otp_option}.`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        otp_option: user.otp_option,
        otp: otpToken,
        base32: user.otp_secret,
        auth_url: user.otp_auth_url
      }
    })
  }
  catch (error) {
    reply.status(400).send({
      error: error instanceof Error ? error.message : 'Failed to request OTP' 
    });
  }
}

/*--------------------------------VERIFY OTP--------------------------------*/

// Route: /api/otp/verify
export async function verifyOtp(request: FastifyRequest, reply: FastifyReply) {
  const { otp } = request.body as { otp: string };

  try {
    // Get user data from request
    const userData = request.user as AuthTokenPayload;
    if (!userData) {
      throw new Error('User authentication failed');
    }
    const db = await getDb();
    const user = await User.findById(db, Number(userData.id));

    if (!user || !user.otp_secret) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid user or user credentials'
      });
    }

    // Instantiate new TOTP object using user secret
    const totp = new OTPAuth.TOTP({
      issuer: 'ft_transcendence',
      algorithm: 'SHA256',
      digits: 6,
      period: 90,
      secret: OTPAuth.Secret.fromBase32(user.otp_secret)
    });

    // Validate OTP token
    const delta = totp.validate({ token: otp, window: 1 });
    if (delta === null) {
      return reply.status(401).send({
        success: false,
        error: 'OTP verification failed'
      });
    }

    // Update database
    await User.setOtpVerified(db, user.id, true);

    // Set access token in cookie
    reply.setCookie('accessToken', await createAccessToken(user, reply), {
      maxAge: 15 * 60, // expires after 15min
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/'
    });

    // Set refresh token in cookie
    reply.setCookie('refreshToken', await createRefreshToken(db, user, reply), {
      maxAge: 7 * 24 * 60 * 60, // expires after 7 days
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth/refresh'
    });

    return reply.status(200).send({ 
        success: true,
        message: 'OTP verified. Login successful',
        user: {
            id: user.id,
            username: user.username,
            email: user.email
        }
    });
  }
  catch (error) {
    return reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

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
    reply.setCookie('accessToken', accessToken, {
      maxAge: 15 * 60, // expires after 15min
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/'
    });

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

/*------------------------------LOGOUT HANDLER------------------------------*/

// Route: /api/logout
export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    reply.header('Access-Control-Allow-Credentials', 'true');
    
    // Remove stored JWT cookies
    reply.clearCookie('preAuthToken', { path: '/api/otp/' });
    reply.clearCookie('accessToken', { path: '/api/' });

    return reply.send({ message: 'Logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    return reply.status(500).send({ 
      message: 'Logout failed', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
