import { JwtPayload } from 'jsonwebtoken';

/*--------------------------GLOBAL TYPE DEFINITIONS-------------------------*/

export interface AuthTokenPayload extends JwtPayload {
  id: number; 
  username?: string;
  email?: string;
  token_id?: string;
  token_type: 'preAuth' | 'access' | 'refresh';
}
