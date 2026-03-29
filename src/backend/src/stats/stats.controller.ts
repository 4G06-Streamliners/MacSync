import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  StatsService,
  type DashboardStats,
  type RecentSignupDto,
} from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/staff.guard';

interface RequestWithUser extends Request {
  user: { sub: number; email: string };
}

@Controller('admin')
@UseGuards(JwtAuthGuard, StaffGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('stats')
  getDashboardStats(@Req() req: RequestWithUser): Promise<DashboardStats> {
    return this.statsService.getDashboardStats(req.user.sub);
  }

  @Get('recent-signups')
  getRecentSignups(
    @Req() req: RequestWithUser,
    @Query('limit') limitStr?: string,
  ): Promise<RecentSignupDto[]> {
    const parsed = limitStr !== undefined ? parseInt(limitStr, 10) : 10;
    const limit = Number.isFinite(parsed) ? parsed : 10;
    return this.statsService.getRecentSignups(req.user.sub, limit);
  }
}
