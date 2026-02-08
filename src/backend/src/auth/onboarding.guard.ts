import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { OnboardingJwtPayload } from './auth.types';

@Injectable()
export class OnboardingGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header = request.headers?.authorization ?? '';
    const token = typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7).trim()
      : null;

    if (!token) {
      throw new UnauthorizedException('Missing onboarding token.');
    }

    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET || 'dev-secret',
      ) as OnboardingJwtPayload;

      if (!payload?.onboarding || !payload.email) {
        throw new UnauthorizedException('Invalid onboarding token.');
      }

      request.onboardingEmail = payload.email;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired onboarding token.');
    }
  }
}
