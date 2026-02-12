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
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // If no roles metadata is present, allow the request (JwtAuthGuard still applies).
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { sub?: number } | undefined;
    if (!user?.sub) {
      throw new ForbiddenException('Access denied.');
    }

    const dbUser = await this.usersService.findOneWithRoles(user.sub);
    if (!dbUser) {
      throw new ForbiddenException('Access denied.');
    }

    const userRoles = new Set(dbUser.roles ?? []);
    // Treat isSystemAdmin as implicit 'Admin' role for RBAC checks.
    if ((dbUser as any).isSystemAdmin) {
      userRoles.add('Admin');
    }

    const hasRole = requiredRoles.some((role) => userRoles.has(role));
    if (!hasRole) {
      throw new ForbiddenException('Access denied.');
    }

    return true;
  }
}

