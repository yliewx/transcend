import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import User from '../../models/user';
import { getDb } from '../../db.js';
import { Database } from 'sqlite';
import OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { AuthTokenPayload } from '../../../@types/global.js';
import { createAccessToken, createRefreshToken, accessCookieOptions, refreshCookieOptions } from '../services/token.service';

/*------------------------------2FA PREFERENCES-----------------------------*/

export async function otpPreferenceHandler(request: FastifyRequest, reply: FastifyReply) {
  const { otp_option, otp_contact } = request.body as { otp_option: string, otp_contact?: string | null };
  if (!otp_option) {
    return reply.status(400).send({ error: 'User OTP option is required' });
  }

  try {
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
    const userData = request.user as AuthTokenPayload;
    if (!userData) {
      throw new Error('User authentication failed');
    }
    const db = await getDb();
    await generateOtpToken(db, Number(userData.id));

    const secret_base32 = await User.getOtpSecret(db, Number(userData.id));
    const otpAuthUrl = await User.getOtpAuthUrl(db, Number(userData.id));
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return reply.status(202).send({
      success: true,
      qrCode: qrCodeDataUrl,
      secret: secret_base32
    });
  } catch (error) {
    return reply.status(400).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate QR code' 
    });
  }
}

async function sendOtp(request: FastifyRequest, db: Database, user: any, otpToken: string) {
  if (user.otp_option === 'app') return;

  if (!user.otp_contact) {
    if (user.otp_option === 'email') {
      throw new Error('Email address is required for Email 2FA');
    } else if (user.otp_option === 'sms') {
      throw new Error('Phone number is required for SMS 2FA');
    }
  }

  switch (user.otp_option) {
    case 'email':
      return await request.server.mailer.sendEmailOtp(user.otp_contact, otpToken);
    case 'sms':
      return await request.server.mailer.sendSmsOtp(user.otp_contact, otpToken);
    default:
      throw new Error(`Unsupported OTP method: ${user.otp_option}`);
  }
}

async function generateOtpToken(db: Database, user_id: number)
{
  const secret_base32 = await User.getOtpSecret(db, user_id);

  const totp = new OTPAuth.TOTP({
    issuer: 'ft_transcendence',
    algorithm: 'SHA256',
    digits: 6,
    period: 90,
    secret: secret_base32 ? new OTPAuth.Secret(secret_base32) : new OTPAuth.Secret(),
  });

  const token = totp.generate();

  await User.setOtpSecret(db, user_id, totp.secret.base32, totp.toString());

  return token;
}

export async function generateOtp(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userData = request.user as AuthTokenPayload;
    if (!userData) {
      throw new Error('User authentication failed');
    }
    const db = await getDb();
    const user = await User.findById(db, Number(userData.id));

    if (user.otp_option === null) {
      throw new Error('Preferred 2FA option not set');
    }

    const otpToken = await generateOtpToken(db, user.id);

    try {
      await sendOtp(request, db, user, otpToken);
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: `Failed to send OTP via ${user.otp_option}.`
      })
    }

    return reply.code(202).send({
      success: true,
      message: `OTP will be sent via ${user.otp_option}.`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        otp_option: user.otp_option
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

export async function verifyOtp(request: FastifyRequest, reply: FastifyReply) {
  const { otp } = request.body as { otp: string };

  try {
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

    const totp = new OTPAuth.TOTP({
      issuer: 'ft_transcendence',
      algorithm: 'SHA256',
      digits: 6,
      period: 90,
      secret: OTPAuth.Secret.fromBase32(user.otp_secret)
    });

    const delta = totp.validate({ token: otp, window: 1 });
    if (delta === null) {
      return reply.status(401).send({
        success: false,
        error: 'OTP verification failed'
      });
    }

    await User.setOtpVerified(db, user.id, true);

    const accessToken = await createAccessToken(user, reply);
    const refreshToken = await createRefreshToken(db, user, reply);

    reply.setCookie('accessToken', accessToken, accessCookieOptions);
    reply.setCookie('refreshToken', refreshToken, refreshCookieOptions);

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
    return reply.status(400).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}