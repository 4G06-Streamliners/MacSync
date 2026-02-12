import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import type { NewUser } from '../db/schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { sub: number; email: string };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (req.user.sub !== +id) {
      throw new ForbiddenException('Access denied.');
    }
    return this.usersService.findOneWithRoles(+id);
  }

  @Post()
  create(@Body() user: NewUser) {
    return this.usersService.create(user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() user: Partial<NewUser>, @Req() req: RequestWithUser) {
    if (req.user.sub !== +id) {
      throw new ForbiddenException('Access denied.');
    }
    return this.usersService.update(+id, user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (req.user.sub !== +id) {
      throw new ForbiddenException('Access denied.');
    }
    return this.usersService.delete(+id);
  }
}
