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
import { TokenPayload } from 'google-auth-library';

// Extend FastifyInstance
declare module "fastify" {
  interface FastifyInstance {
    // Add authentication methods
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    preAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    reAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    jwtSign: (payload: string | object | Buffer, secretOrPrivateKey: string, options?: SignOptions) => string;
    jwtVerify: (token: string, secretOrPublicKey: string, options?: VerifyOptions) => any;
    
    // Verification for Google ID token
    verifyGoogleToken: (idToken: string) => Promise<TokenPayload | null>;

    // Add mailer property for 2FA
    mailer: {
      transporter?: any;
      sendEmailOtp: (email: string, otpToken: string) => Promise<boolean>;
      sendSmsOtp: (phoneNumber: string, otpToken: string) => Promise<boolean>;
    };
  }
}

// export interface AuthenticatedRequest extends FastifyRequest {
//   user: {
//     id: number;
//     username: string;
//     email: string;
//   }
//   body: any;
// }

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: number;
    username: string;
    email: string;
  };
  body: any;
  query: {
    q: string;
    [key: string]: any;
  };
  params: {
    id?: string;
    [key: string]: string | undefined;
  };
}

// export interface AuthenticatedRequest extends FastifyRequest {
//   user: {
//     id: number;
//     username: string;
//     email: string;
//   };
//   body: any;
//   query: SearchQuery | LeaderboardQuery | OtherQuery;
//   params: {
//     id?: string;
//     [key: string]: any;
//   };
// }

// interface SearchQuery {
//   q: string;
//   [key: string]: any;
// }

// interface LeaderboardQuery {
//   offset: number;
//   [key: string]: any;
// }

// interface OtherQuery {
//   [key: string]: any;
// }