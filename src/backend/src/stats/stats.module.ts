import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { UsersModule } from '../users/users.module';
import { StaffGuard } from '../auth/staff.guard';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [StatsController],
  providers: [StatsService, StaffGuard],
  exports: [StatsService],
})
export class StatsModule {}
