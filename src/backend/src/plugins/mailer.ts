import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import nodemailer from 'nodemailer';

export default fp(async function setupMailer(server: FastifyInstance) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });

  try {
    await transporter.verify();
    server.log.info('Nodemailer connection established');
  } catch (error) {
    server.log.error('Failed to establish Nodemailer connection', error);
  }

  if (!server.hasDecorator("mailer")) {
    server.decorate("mailer", {} as any);
  }

  server.mailer.transporter = transporter;
  
  server.mailer.sendEmailOtp = async (email: string, otpToken: string): Promise<boolean> => {
    try {
      const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'App Security'}" <${process.env.EMAIL_FROM_ADDRESS || 'security@yourapp.com'}>`,
        to: email,
        subject: 'Your Verification Code',
        text: `Your verification code is: ${otpToken}\n\nThis code will expire in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verification Code</h2>
            <p>Use the following code to complete your authentication:</p>
            <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
              ${otpToken}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
          </div>
        `,
      });
      
      server.log.info(`Email OTP sent to ${email}, messageId: ${info.messageId}`);
      return true;
    } catch (error) {
      server.log.error('Failed to send Email OTP:', error);
      throw new Error('Failed to send verification code via Email');
    }
  }
});

