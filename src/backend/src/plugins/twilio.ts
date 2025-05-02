import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import twilio from 'twilio';

export default fp(async function setupTwilio(server: FastifyInstance) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    server.log.error('Twilio environment variables are missing');
    throw new Error('Missing Twilio configuration');
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  if (!server.hasDecorator('mailer')) {
    server.decorate('mailer', {} as any);
  }

  server.mailer.sendSmsOtp = async (phoneNumber: string, otpToken: string): Promise<boolean> => {
    try {
      const message = await client.messages.create({
        body: `Your verification code is: ${otpToken}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      server.log.info(`SMS OTP sent to ${phoneNumber}, SID: ${message.sid}`);
      return true;
    } catch (error) {
      server.log.error(`Failed to send SMS OTP to ${phoneNumber}:`, error);
      throw new Error('Failed to send verification code via SMS');
    }
  };
});
