import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DatabaseService } from '../database/database.service';
import { events, roles, userRoles, users } from '../db/schema';
import { eq } from 'drizzle-orm';

interface RequestWithUser extends Request {
  user: { sub: number; email: string };
}

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly dbService: DatabaseService) {}

  private async assertSuperAdmin(userId: number): Promise<void> {
    const me = await this.dbService.db
      .select({ isSystemAdmin: users.isSystemAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!me[0]?.isSystemAdmin) {
      throw new BadRequestException('Only super admins can manage roles.');
    }
  }

  @Get()
  async list(@Req() req: RequestWithUser) {
    await this.assertSuperAdmin(req.user.sub);
    const rows = await this.dbService.db.select().from(roles).orderBy(roles.name);
    return rows;
  }

  @Post()
  async create(
    @Req() req: RequestWithUser,
    @Body() body: { name?: string },
  ) {
    await this.assertSuperAdmin(req.user.sub);
    const name = (body.name ?? '').trim();
    if (!name) throw new BadRequestException('Role name is required.');

    const existing = await this.dbService.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const [created] = await this.dbService.db
      .insert(roles)
      .values({ name })
      .returning();

    return created;
  }

  @Delete(':id')
  async deleteRole(@Req() req: RequestWithUser, @Param('id') id: string) {
    await this.assertSuperAdmin(req.user.sub);
    const roleId = Number(id);
    if (!Number.isFinite(roleId)) {
      throw new BadRequestException('Invalid role id.');
    }

    const existing = await this.dbService.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    if (!existing[0]) {
      throw new BadRequestException('Role not found.');
    }

    const roleName = existing[0].name;
    if (roleName === 'Member') {
      throw new BadRequestException(`Role ${roleName} cannot be deleted.`);
    }

    const [assignedUsers, managedEvents] = await Promise.all([
      this.dbService.db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.roleId, roleId)),
      this.dbService.db
        .select({ eventId: events.id })
        .from(events)
        .where(eq(events.managingRoleId, roleId)),
    ]);

    await this.dbService.db.delete(roles).where(eq(roles.id, roleId));

    return {
      ok: true,
      deletedRoleId: roleId,
      deletedRoleName: roleName,
      affectedUsers: assignedUsers.length,
      affectedEvents: managedEvents.length,
    };
  }
}

