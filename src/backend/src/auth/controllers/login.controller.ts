import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import User from '../../models/user';
import Profile from '../../models/profile';
import { getDb } from '../../db.js';
import { Database } from 'sqlite';
import { createPreAuthToken, createAccessToken, createRefreshToken, accessCookieOptions, refreshCookieOptions } from '../services/token.service';
import { registerGoogleUser } from '../../controllers/user.register';

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

    let user = await validateUserCredentials(db, username, password);
    if (!user) {
      return reply.code(401).send({ 
        success: false,
        error: 'Invalid username or password' 
      });
    }

    const otp_option = await User.getPreferred2FAMethod(db, user.id);

    reply.setCookie('preAuthToken', await createPreAuthToken(user, reply), {
      maxAge: 5 * 60,
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

export async function googleAuthCallbackHandler(request: FastifyRequest<{ Body: { idToken: string }}>, reply: FastifyReply) {
  const { idToken } = request.body;
  if (!idToken) {
    return reply.status(400).send({ 
      success: false, 
      error: 'No ID token provided' 
    });
  }

  const userData = await request.server.verifyGoogleToken(idToken);
  if (!userData) {
      return reply.status(401).send({ success: false, error: 'Invalid token' });
  }

  try {
    const { sub: google_id, name, email, picture } = userData;
    if (!email) {
      throw new Error("Email is required for user registration");
    }
    const db = await getDb();

    let user = await User.findByGoogleId(db, google_id);
    if (!user)
    {
      user = await User.findByEmail(db, email);
      if (!user)
      {
        request.server.log.info(`Creating new user from Google user info: ${name}, ${email}; Google ID: ${google_id}`);
        user = await registerGoogleUser(db, request.server, name, email, google_id);
        request.server.log.info('New user created');
      } else {
        await User.updateGoogleId(db, user.id, google_id);
        user = await User.findByGoogleId(db, google_id);
        request.server.log.info(`User exists in database: ${user.username}, ${user.email}. Updating with Google ID: ${user.google_id}`);
      }
    } else {
      request.server.log.info(`Google user exists in database: ${user.username}, ${user.email}; Google ID: ${user.google_id}`);
    }

    const accessToken = await createAccessToken(user, reply);
    const refreshToken = await createRefreshToken(db, user, reply);
    
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
