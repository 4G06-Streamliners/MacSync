import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PaymentsModule } from './payments/payments.module';
import { StatsModule } from './stats/stats.module';
import { RefundRequestsModule } from './refund-requests/refund-requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    UsersModule,
    EventsModule,
    WebhooksModule,
    PaymentsModule,
    AuthModule,
    StatsModule,
    RefundRequestsModule,
    NotificationsModule,
    RolesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
