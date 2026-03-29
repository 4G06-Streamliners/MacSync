import { Module } from '@nestjs/common';
import { RefundRequestsController } from './refund-requests.controller';
import { RefundRequestsService } from './refund-requests.service';
import { DatabaseModule } from '../database/database.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { StaffGuard } from '../auth/staff.guard';

@Module({
  imports: [DatabaseModule, PaymentsModule, NotificationsModule, UsersModule],
  controllers: [RefundRequestsController],
  providers: [RefundRequestsService, StaffGuard],
  exports: [RefundRequestsService],
})
export class RefundRequestsModule {}
