import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import User from '../../models/user';
import Profile from '../../models/profile';
import { getDb } from '../../db.js';
import { Database } from 'sqlite';
import { createPreAuthToken, createAccessToken, createRefreshToken, accessCookieOptions, refreshCookieOptions } from '../services/token.service';
import { registerGoogleUser } from '../../controllers/user.register';

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
  const { username, password } = request.body as { username: string, password: string };
  
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

/*------------------------------GOOGLE SIGN-IN------------------------------*/

// Route: /api/auth/google/callback -> handle response from Google
export async function googleAuthCallbackHandler(request: FastifyRequest<{ Body: { idToken: string }}>, reply: FastifyReply) {
  // Get ID token from request
  const { idToken } = request.body;
  if (!idToken) {
    return reply.status(400).send({ 
      success: false, 
      error: 'No ID token provided' 
    });
  }

  // Verify ID token
  const userData = await request.server.verifyGoogleToken(idToken);
  request.server.log.info("Google Token Payload:", userData);
  // return reply.status(200).send({ success: true, message: 'Google token verified successfully' });
  if (!userData) {
      return reply.status(401).send({ success: false, error: 'Invalid token' });
  }

  try {
    const { sub: google_id, name, email, picture } = userData;
    if (!email) {
      throw new Error("Email is required for user registration");
    }
    const db = await getDb();

    /* Check if user exists in database
    - If user registered by email but logged in with google: update database with google ID */
    let user = await User.findByGoogleId(db, google_id);
    if (!user)
    {
      // Check if user with that email exists
      user = await User.findByEmail(db, email);
      if (!user)
      {
        // No user with that google ID or email -> create new user
        request.server.log.info(`Creating new user from Google user info: ${name}, ${email}; Google ID: ${google_id}`);
        user = await registerGoogleUser(db, request.server, name, email, google_id);
        request.server.log.info('New user created');
      } else {
        // User exists but no google ID in database -> update user google ID
        await User.updateGoogleId(db, user.id, google_id);
        user = await User.findByGoogleId(db, google_id);
        request.server.log.info(`User exists in database: ${user.username}, ${user.email}. Updating with Google ID: ${user.google_id}`);
      }
    } else { // User exists with that google ID
      request.server.log.info(`Google user exists in database: ${user.username}, ${user.email}; Google ID: ${user.google_id}`);
    }

    // Create new access and refresh tokens
    const accessToken = await createAccessToken(user, reply);
    const refreshToken = await createRefreshToken(db, user, reply);
    
    // Set access and refresh tokens in cookie
    reply.setCookie('accessToken', accessToken, accessCookieOptions);
    reply.setCookie('refreshToken', refreshToken, refreshCookieOptions);

    return reply.status(200).send({ 
      success: true,
      message: 'Google sign-in successful',
      user: {
          id: user.id,
          username: user.username,
          email: user.email
      }
    });
  } catch (err) {
    request.server.log.info(`CAUGHT ERROR: ${err}`);
    reply.code(500).send({ error: 'Google Authentication failed' });
  }
}
