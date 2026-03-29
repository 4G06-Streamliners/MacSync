import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService], // Export so other modules can use it
})
export class PaymentsModule {}
