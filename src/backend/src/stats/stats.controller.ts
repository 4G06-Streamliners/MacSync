import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatsService, type DashboardStats } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('stats')
  @Roles('Admin')
  getDashboardStats(): Promise<DashboardStats> {
    return this.statsService.getDashboardStats();
  }
}
