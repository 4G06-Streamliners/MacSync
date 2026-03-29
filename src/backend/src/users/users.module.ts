import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthorizationService } from './authorization.service';
import { RolesGuard } from '../auth/roles.guard';
import { StaffGuard } from '../auth/staff.guard';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AuthorizationService, RolesGuard, StaffGuard],
  exports: [UsersService, AuthorizationService, RolesGuard, StaffGuard],
})
export class UsersModule {}
