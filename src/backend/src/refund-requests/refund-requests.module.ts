import { Module } from '@nestjs/common';
import { RefundRequestsController } from './refund-requests.controller';
import { RefundRequestsService } from './refund-requests.service';
import { DatabaseModule } from '../database/database.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, PaymentsModule, NotificationsModule],
  controllers: [RefundRequestsController],
  providers: [RefundRequestsService],
  exports: [RefundRequestsService],
})
export class RefundRequestsModule {}
