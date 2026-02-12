import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verify } from 'jsonwebtoken';

interface RequestWithHeaders {
  headers?: { authorization?: string };
  user?: { sub: number; email: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // M8: validateToken(token) -> verify JWT before protected routes.
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const header = request.headers?.authorization ?? '';
    const token = typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7).trim()
      : null;

    if (!token) {
      throw new UnauthorizedException('Missing authorization token.');
    }

    try {
      const decoded = verify(
        token,
        process.env.JWT_SECRET || 'dev-secret',
      );

      if (typeof decoded !== 'object' || decoded === null) {
        throw new UnauthorizedException('Invalid token payload.');
      }

      const { sub, email } = decoded as { sub?: unknown; email?: unknown };
      if (!sub || typeof email !== 'string') {
        throw new UnauthorizedException('Invalid token payload.');
      }

      request.user = { sub: Number(sub), email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
