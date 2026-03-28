import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  StatsService,
  type DashboardStats,
  type RecentSignupDto,
} from './stats.service';
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

  @Get('recent-signups')
  @Roles('Admin')
  getRecentSignups(
    @Query('limit') limitStr?: string,
  ): Promise<RecentSignupDto[]> {
    const parsed = limitStr !== undefined ? parseInt(limitStr, 10) : 10;
    const limit = Number.isFinite(parsed) ? parsed : 10;
    return this.statsService.getRecentSignups(limit);
  }
}
