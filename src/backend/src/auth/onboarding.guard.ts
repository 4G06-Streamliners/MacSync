import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verify } from 'jsonwebtoken';

interface RequestWithHeaders {
  headers?: { authorization?: string };
  onboardingEmail?: string;
}

@Injectable()
export class OnboardingGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const header = request.headers?.authorization ?? '';
    const token = typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7).trim()
      : null;

    if (!token) {
      throw new UnauthorizedException('Missing onboarding token.');
    }

    try {
      const decoded = verify(
        token,
        process.env.JWT_SECRET || 'dev-secret',
      );

      if (typeof decoded !== 'object' || decoded === null) {
        throw new UnauthorizedException('Invalid onboarding token.');
      }

      const { onboarding, email } = decoded as {
        onboarding?: unknown;
        email?: unknown;
      };
      if (onboarding !== true || typeof email !== 'string') {
        throw new UnauthorizedException('Invalid onboarding token.');
      }

      request.onboardingEmail = email;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired onboarding token.');
    }
  }
}
