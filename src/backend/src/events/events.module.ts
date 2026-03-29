import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { VenueReportPdfService } from './venue-report-pdf.service';
import { DatabaseModule } from '../database/database.module';
import { PaymentsModule } from '../payments/payments.module';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../auth/roles.guard';
import { StaffGuard } from '../auth/staff.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, PaymentsModule, UsersModule, NotificationsModule],
  controllers: [EventsController],
  providers: [EventsService, VenueReportPdfService, RolesGuard, StaffGuard],
  exports: [EventsService],
})
export class EventsModule {}
