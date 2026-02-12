import { Controller, Get } from '@nestjs/common';
import { StatsService, type DashboardStats } from './stats.service';

@Controller('admin')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('stats')
  getDashboardStats(): Promise<DashboardStats> {
    return this.statsService.getDashboardStats();
  }
}
