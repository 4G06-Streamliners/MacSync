import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';

/**
 * Allows users who may use staff tools:
 * - global admins (`isSystemAdmin` or `Admin` role)
 * - scoped admins with managed events
 * - team/admin roles even before explicit event mappings are assigned
 */
@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { sub?: number } }>();
    const user = request.user;
    if (!user?.sub) {
      throw new ForbiddenException('Access denied.');
    }

    const dbUser = await this.usersService.findOneWithRoles(user.sub);
    if (!dbUser) {
      throw new ForbiddenException('Access denied.');
    }

    const roles = dbUser.roles ?? [];
    const managed = dbUser.managedEventIds ?? [];
    const isGlobalAdmin = !!dbUser.isSystemAdmin || roles.includes('Admin');
    const hasTeamAdminRole = roles.some(
      (role) => role !== 'Member' && role !== 'Admin',
    );

    if (isGlobalAdmin || managed.length > 0 || hasTeamAdminRole) {
      return true;
    }

    throw new ForbiddenException('Access denied.');
  }
}
