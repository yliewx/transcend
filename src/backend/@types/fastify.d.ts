import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SignOptions, VerifyOptions } from 'jsonwebtoken';
import "@fastify/jwt";
import { TokenPayload } from 'google-auth-library';
import { MultipartFile } from '@fastify/multipart';

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    preAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    reAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateGame: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateUser: (request: FastifyRequest) => Promise<any>;
    jwtSign: (payload: string | object | Buffer, secretOrPrivateKey: string, options?: SignOptions) => string;
    jwtVerify: (token: string, secretOrPublicKey: string, options?: VerifyOptions) => any;
    
    verifyGoogleToken: (idToken: string) => Promise<TokenPayload | null>;

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
  file(): Promise<MultipartFile | undefined>;
  files(): AsyncIterableIterator<MultipartFile>;
}