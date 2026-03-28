import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { VenueReportPdfService } from './venue-report-pdf.service';
import { DatabaseModule } from '../database/database.module';
import { PaymentsModule } from '../payments/payments.module';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [DatabaseModule, PaymentsModule, UsersModule],
  controllers: [EventsController],
  providers: [EventsService, VenueReportPdfService, RolesGuard],
  exports: [EventsService],
})
export class EventsModule {}
