import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // M8: validateToken(token) -> verify JWT before protected routes.
    const request = context.switchToHttp().getRequest();
    const header = request.headers?.authorization ?? '';
    const token = typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7).trim()
      : null;

    if (!token) {
      throw new UnauthorizedException('Missing authorization token.');
    }

    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET || 'dev-secret',
      ) as JwtPayload;

      if (!payload?.sub || !payload.email) {
        throw new UnauthorizedException('Invalid token payload.');
      }

      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
