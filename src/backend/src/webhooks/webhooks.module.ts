import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { EventsModule } from '../events/events.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [EventsModule, PaymentsModule, NotificationsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
