import { JwtPayload } from 'jsonwebtoken';

/*--------------------------GLOBAL TYPE DEFINITIONS-------------------------*/

// jwt.ts
export interface AuthTokenPayload extends JwtPayload {
  id: number; // user id
  username?: string;
  email?: string;
  token_id?: string;
  token_type: 'preAuth' | 'access' | 'refresh';
}
