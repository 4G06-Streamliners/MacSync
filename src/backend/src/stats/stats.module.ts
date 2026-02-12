import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [StatsController],
  providers: [StatsService, RolesGuard],
  exports: [StatsService],
})
export class StatsModule {}
