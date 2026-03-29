import { ForbiddenException, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { eventAdmins, events, users, userRoles, roles } from '../db/schema';
import type { StaffAccess } from './authorization.types';

@Injectable()
export class AuthorizationService {
  constructor(private readonly dbService: DatabaseService) {}

  async getStaffAccess(userId: number): Promise<StaffAccess> {
    const userRow = await this.dbService.db
      .select({
        isSystemAdmin: users.isSystemAdmin,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRow[0]) {
      throw new ForbiddenException('Access denied.');
    }

    const roleRows = await this.dbService.db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    const roleNames = roleRows.map((r) => r.roleName);

    // Events are scoped via `events.managingRoleId`.
    const roleIdRows = await this.dbService.db
      .select({ roleId: roles.id })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    const roleIds = roleIdRows.map((r) => r.roleId);
    let managedEventIds: number[] = [];
    if (roleIds.length > 0) {
      const managedRows = await this.dbService.db
        .select({ eventId: events.id })
        .from(events)
        .where(inArray(events.managingRoleId, roleIds));
      managedEventIds = managedRows.map((r) => r.eventId);
    }
    const isGlobalAdmin =
      !!userRow[0].isSystemAdmin || roleNames.includes('Admin');

    return {
      isSystemAdmin: !!userRow[0].isSystemAdmin,
      isGlobalAdmin,
      managedEventIds,
    };
  }

  canManageEvent(access: StaffAccess, eventId: number): boolean {
    if (access.isGlobalAdmin) return true;
    return access.managedEventIds.includes(eventId);
  }

  async assertCanManageEvent(userId: number, eventId: number): Promise<void> {
    const access = await this.getStaffAccess(userId);
    if (!this.canManageEvent(access, eventId)) {
      throw new ForbiddenException('Access denied.');
    }
  }

  /** Replace event admin assignments for a single event (global admins only). */
  async setEventAdminsForEvent(
    eventId: number,
    adminUserIds: number[],
  ): Promise<void> {
    const unique = [...new Set(adminUserIds.filter((n) => Number.isFinite(n)))];
    await this.dbService.db
      .delete(eventAdmins)
      .where(eq(eventAdmins.eventId, eventId));
    if (unique.length === 0) return;
    await this.dbService.db.insert(eventAdmins).values(
      unique.map((uid) => ({
        userId: uid,
        eventId,
      })),
    );
  }

  /** True if user has any staff capability (global or scoped). */
  async isStaffUser(userId: number): Promise<boolean> {
    const access = await this.getStaffAccess(userId);
    return access.isGlobalAdmin || access.managedEventIds.length > 0;
  }

  /** null = all events (global admin); otherwise restrict to these IDs. */
  eventIdFilterForScopedAccess(access: StaffAccess): number[] | null {
    if (access.isGlobalAdmin) return null;
    return access.managedEventIds;
  }
}
