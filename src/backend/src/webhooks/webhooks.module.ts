import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { EventsModule } from '../events/events.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [EventsModule, PaymentsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
