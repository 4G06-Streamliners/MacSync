import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import type { NewUser } from '../db/schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

type UpdateUserBody = Partial<NewUser> & { password?: string };

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('Admin')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('Admin')
  findOne(@Param('id') id: string) {
    // Admin panel: any authenticated admin can view user profiles.
    // Fine-grained per-user access control will be added later if needed.
    return this.usersService.findOneWithRoles(+id);
  }

  @Post()
  @Roles('Admin')
  create(@Body() user: NewUser) {
    return this.usersService.create(user);
  }

  @Put(':id')
  @Roles('Admin')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateUserBody,
    @Req() req: { user?: { sub?: number } },
  ) {
    const user = { ...body };
    if (user.isSystemAdmin !== undefined) {
      if (!user.password || typeof user.password !== 'string') {
        throw new BadRequestException('Password is required to change admin role.');
      }
      const currentUserId = req.user?.sub;
      if (!currentUserId) {
        throw new UnauthorizedException('Not authenticated.');
      }
      const valid = await this.usersService.verifyUserPassword(currentUserId, user.password);
      if (!valid) {
        throw new UnauthorizedException('Invalid password.');
      }
      delete (user as UpdateUserBody).password;
    }
    await this.usersService.update(+id, user);
    const updated = await this.usersService.findOneWithRoles(+id);
    if (!updated) throw new Error('User not found after update');
    return updated;
  }

  @Put(':id/roles')
  @Roles('Admin')
  updateRoles(
    @Param('id') id: string,
    @Body() body: { roles?: string[] },
  ) {
    const roles = Array.isArray(body.roles) ? body.roles : [];
    return this.usersService.replaceRoles(+id, roles);
  }

  @Delete(':id')
  @Roles('Admin')
  delete(@Param('id') id: string) {
    // Admin panel: any authenticated admin can delete user profiles.
    // Fine-grained per-user access control will be added later if needed.
    return this.usersService.delete(+id);
  }
}
