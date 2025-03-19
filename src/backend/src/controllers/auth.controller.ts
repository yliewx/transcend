import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import User from '../models/user';
import Profile from '../models/profile';
import { getDb } from '../db.js';
import { Database } from 'sqlite';
import OTPAuth from 'otpauth';
import nodemailer from 'nodemailer';

interface LoginRequest {
  username: string;
  password: string;
}

interface OtpRequest {
  id: string;
  otp: string;
}

interface OtpUpdateRequest {
  id: string;
  method: string;
  phoneNumber?: string;
}

/* Login process

1. loginHandler:
  - [REQUEST]: username, password
  - Check if user exists in database & verify password
  - Create pre-authentication token with expiry (to identify the user during OTP verification)
  - [RESPONSE]: pre-auth token, preferred 2FA method

2. generateOtp: [Request requires: pre-auth token, user's selected 2FA method]
  - Verify pre-auth token to get user
  - Verify 2FA method: email, sms, authenticator
  - Generate OTP token & store user-specific otp_secret in database
  - Send OTP token via chosen 2FA method

3. verifyOtp:
  - Verify pre-auth token to get user
  - Verify OTP
  - Issue JWT token if 2FA is successful */

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

    // 2. Get preferred 2FA method. If not set (first time), frontend will prompt user to set a method
    const preferredMethod = await User.getPreferred2FAMethod(db, user.id);

    // Create JWT pre-auth token with user data
    const preAuthToken = reply.server.jwt.sign({ 
      id: user.id,
      username: user.username,
      email: user.email
    });
    
    // Set JWT token in response
    return reply.status(202).send({ 
        success: true,
        message: 'Please select a preferred 2FA method to log in.',
        preAuthToken: preAuthToken,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            preferredMethod: preferredMethod
        }
    });

    // // 3. Generate OTP
    // const otpToken = await generateOtp(db, user);
    // user = await User.findByUsername(db, username);

    // // 4. Send OTP
    // // await sendOtp(user, otpToken, preferredMethod);

    // return reply.code(202).send({
    //   success: true,
    //   message: `OTP will be sent via ${preferredMethod}.`,
    //   method: preferredMethod,
    //   user_id: user.id,
    //   otp: otpToken,
    //   base32: user.otp_secret,
    //   auth_url: user.otp_auth_url
    // })
  }
  catch (error) {
    console.error('Login error:', error);
    return reply.code(500).send({ 
      error: 'An error occurred during login'
    });
  }
}

/*---------------------------------SEND OTP---------------------------------*/

// Handle sending OTP based on preferred method
// async function sendOtp(user: any, otp: string, method: string) {
  // if (method === 'email') {
  //   await sendEmailOtp(user.email, otp);
  // }
// }

// Generate OTP
async function generateOtp(db: Database, user: any)
{
  // Instantiate TOTP object
  const totp = new OTPAuth.TOTP({
    issuer: 'ft_transcendence',
    algorithm: 'SHA256',
    digits: 6,
    period: 90,
    secret: new OTPAuth.Secret()
  });

  // Generate OTP as string
  const token = totp.generate();

  // Store secret and auth url in database
  await User.setOtpSecret(db, user.id, totp.secret.base32, totp.toString());

  return token;
}

/*--------------------------------VERIFY OTP--------------------------------*/

// Route: /api/otp/verify
export async function verifyOtp(request: FastifyRequest, reply: FastifyReply) {
  const { id, otp } = request.body as OtpRequest;

  try {
    const db = await getDb();

    const user = await User.findById(db, Number(id));
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
      period: 45,
      secret: user.otp_secret
    });

    // Validate OTP token
    const delta = totp.validate({ token: otp });
    if (delta === null) {
      return reply.status(401).send({
        success: false,
        error: 'OTP verification failed'
      });
    }

    // Update database
    await User.setOtpVerified(db, Number(id), true);

    // Create JWT token with user data
    const token = reply.server.jwt.sign({ 
      id: user.id,
      username: user.username,
      email: user.email
    });
    
    // Set JWT token in response
    return reply.status(200).send({ 
        success: true,
        token: token,
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

/*------------------------------2FA PREFERENCES-----------------------------*/

// Route: /api/otp/preference
export async function otpPreferenceHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id, method, phoneNumber } = request.body as OtpUpdateRequest;

  if (!id || !method) {
    return reply.status(400).send({ error: 'User ID and 2FA method are required' });
  }

  try {
    const db = await getDb();

    await User.updatePreferred2FAMethod(db, Number(id), method, phoneNumber);
    reply.send({
      success: true, 
      message: `2FA method updated as ${method}`
    });
  } catch (error) {
    reply.status(400).send({
      error: error instanceof Error ? error.message : 'Failed to update 2FA method' 
    });
  }
}

/*------------------------------LOGOUT HANDLER------------------------------*/

// Route: /api/logout
export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    reply.header('Access-Control-Allow-Credentials', 'true');
    
    // Remove stored JWT cookie
    reply.clearCookie('token', {
      path: '/',
      httpOnly: true
    });

    return reply.send({ message: 'Logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    return reply.status(500).send({ 
      message: 'Logout failed', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
