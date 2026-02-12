import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UsersService } from '../users/users.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles metadata is present, allow the request (JwtAuthGuard still applies).
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { sub?: number } }>();
    const user = request.user;
    if (!user?.sub) {
      throw new ForbiddenException('Access denied.');
    }

    let dbUser;
    try {
      dbUser = await this.usersService.findOneWithRoles(user.sub);
    } catch (err) {
      console.error('[RolesGuard] findOneWithRoles error:', err);
      throw new ForbiddenException('Access denied.');
    }

    if (!dbUser) {
      throw new ForbiddenException('Access denied.');
    }

    const userWithRoles = dbUser as {
      roles?: string[];
      isSystemAdmin?: boolean;
    };
    const userRoles = new Set(userWithRoles.roles ?? []);
    // Treat isSystemAdmin as implicit 'Admin' role for RBAC checks.
    if (userWithRoles.isSystemAdmin) {
      userRoles.add('Admin');
    }

    const hasRole = requiredRoles.some((role) => userRoles.has(role));
    if (!hasRole) {
      throw new ForbiddenException('Access denied.');
    }

    return true;
  }
}
