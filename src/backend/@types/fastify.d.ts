// import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// import "@fastify/jwt";

// Extend FastifyInstance
// declare module "fastify" {
//   // Add the "authenticate" method
//   interface FastifyInstance {
//     authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//     preAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//   }
//   // interface FastifyRequest {
//   //   user?: {
//   //     userId: number;
//   //     username: string;
//   //     email: string;
//   //     iat: number;
//   //   };
//   // }
// }

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SignOptions, VerifyOptions } from 'jsonwebtoken';
import "@fastify/jwt";
import { OAuth2Namespace } from '@fastify/oauth2';

// Extend FastifyInstance
declare module "fastify" {
  interface FastifyInstance {
    // Add authentication methods
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    preAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    reAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    jwtSign: (payload: string | object | Buffer, secretOrPrivateKey: string, options?: SignOptions) => string;
    jwtVerify: (token: string, secretOrPublicKey: string, options?: VerifyOptions) => any;
    googleOAuth2: OAuth2Namespace;
    
    // Add mailer property
    mailer: {
      transporter?: any;
      sendEmailOtp: (email: string, otpToken: string) => Promise<boolean>;
      sendSmsOtp: (phoneNumber: string, otpToken: string) => Promise<boolean>;
    };
  }
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: number;
    username: string;
    email: string;
  }
  body: any;
}