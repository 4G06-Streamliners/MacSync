import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { StaffGuard } from '../auth/staff.guard';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, StaffGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
