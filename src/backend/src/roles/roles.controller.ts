import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DatabaseService } from '../database/database.service';
import { roles, users } from '../db/schema';
import { eq } from 'drizzle-orm';

interface RequestWithUser extends Request {
  user: { sub: number; email: string };
}

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly dbService: DatabaseService) {}

  @Get()
  async list(@Req() req: RequestWithUser) {
    const rows = await this.dbService.db.select().from(roles).orderBy(roles.name);
    const me = await this.dbService.db
      .select({ isSystemAdmin: users.isSystemAdmin })
      .from(users)
      .where(eq(users.id, req.user.sub))
      .limit(1);
    if (!me[0]?.isSystemAdmin) {
      throw new BadRequestException('Only super admins can view roles.');
    }
    return rows;
  }

  @Post()
  async create(
    @Req() req: RequestWithUser,
    @Body() body: { name?: string },
  ) {
    const name = (body.name ?? '').trim();
    if (!name) throw new BadRequestException('Role name is required.');

    // Enforce super admin specifically for role creation.
    const me = await this.dbService.db
      .select({ isSystemAdmin: users.isSystemAdmin })
      .from(users)
      .where(eq(users.id, req.user.sub))
      .limit(1);

    if (!me[0]?.isSystemAdmin) {
      throw new BadRequestException('Only super admins can create roles.');
    }

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
}

