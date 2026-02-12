import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Declare which roles are allowed to access a route.
 * Example: @Roles('Admin') or @Roles('Admin', 'Member')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

