import jwt from 'jsonwebtoken';
import { generateId } from '@acp/shared';
import type { AccessTokenClaims } from './types.js';

export interface TokenServiceOptions {
  readonly accessSecret: string;
  readonly refreshSecret: string;
  readonly accessExpiresIn: string;
  readonly refreshExpiresIn: string;
}

export interface IssuedRefreshToken {
  readonly token: string;
  readonly id: string;
  readonly expiresAt: Date;
}

type ExpiresIn = Exclude<jwt.SignOptions['expiresIn'], undefined>;

export class TokenService {
  constructor(private readonly options: TokenServiceOptions) {}

  signAccessToken(claims: AccessTokenClaims): string {
    return jwt.sign(claims, this.options.accessSecret, {
      expiresIn: this.options.accessExpiresIn as ExpiresIn,
    });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    return jwt.verify(token, this.options.accessSecret) as AccessTokenClaims;
  }

  issueRefreshToken(userId: string): IssuedRefreshToken {
    const id = generateId();
    const token = jwt.sign(
      { sub: userId, jti: id },
      this.options.refreshSecret,
      { expiresIn: this.options.refreshExpiresIn as ExpiresIn },
    );
    const decoded = jwt.decode(token);
    const exp =
      decoded !== null && typeof decoded === 'object' && 'exp' in decoded
        ? (decoded.exp as number)
        : Math.floor(Date.now() / 1000);

    return { token, id, expiresAt: new Date(exp * 1000) };
  }

  verifyRefreshToken(token: string): { sub: string; jti: string } {
    return jwt.verify(token, this.options.refreshSecret) as {
      sub: string;
      jti: string;
    };
  }
}
